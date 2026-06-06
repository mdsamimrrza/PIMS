const fs = require('node:fs/promises');
const { resolve, relative, dirname } = require('node:path');
const nodemailer = require('nodemailer');
const Alert = require('../models/Alert.model');
const {
  buildInviteEmail,
  buildPasswordChangedEmail,
  buildPasswordResetEmail,
  buildPrescriptionNotificationEmail,
} = require('../utils/emailTemplates');

const currentDir = __dirname;
const backendRoot = resolve(currentDir, '../..');
let smtpTransporter = null;

const getEmailMode = () => String(process.env.EMAIL_MODE || 'file').trim().toLowerCase();

const getOutboxDir = () => resolve(backendRoot, process.env.EMAIL_OUTBOX_DIR || 'outbox');

const getSmtpPort = () => {
  const port = Number(process.env.SMTP_PORT || 587);
  return Number.isInteger(port) && port > 0 ? port : 587;
};

const getSmtpFrom = () => {
  const from = String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  if (!from) {
    throw new Error('SMTP_FROM or SMTP_USER is required for EMAIL_MODE=smtp');
  }

  return from;
};

const getSmtpTransporter = () => {
  if (smtpTransporter) {
    return smtpTransporter;
  }

  const host = String(process.env.SMTP_HOST || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '');

  if (!host) {
    throw new Error('SMTP_HOST is required for EMAIL_MODE=smtp');
  }

  if (!user) {
    throw new Error('SMTP_USER is required for EMAIL_MODE=smtp');
  }

  if (!pass) {
    throw new Error('SMTP_PASS is required for EMAIL_MODE=smtp');
  }

  smtpTransporter = nodemailer.createTransport({
    host,
    port: getSmtpPort(),
    secure: String(process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true',
    auth: {
      user,
      pass,
    },
  });

  return smtpTransporter;
};

const sanitizeFilename = (value) =>
  String(value || 'email')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'email';

const writeEmailToOutbox = async (payload) => {
  const outboxDir = getOutboxDir();
  await fs.mkdir(outboxDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}-${sanitizeFilename(payload.type)}-${sanitizeFilename(payload.to)}.json`;
  const filepath = resolve(outboxDir, filename);

  await fs.writeFile(
    filepath,
    JSON.stringify(
      {
        ...payload,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf8'
  );

  return {
    delivered: true,
    mode: 'file',
    outboxFile: relative(backendRoot, filepath),
  };
};

const writeEmailLog = async (email, status, type, details = '') => {
  try {
    const logDir = resolve(backendRoot, 'logs');
    await fs.mkdir(logDir, { recursive: true });
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${status} for ${email} ${details ? '- ' + details : ''}\n`;
    await fs.appendFile(resolve(logDir, 'email-activity.log'), logMessage, 'utf8');
    if (status === 'FAILED') {
      await Alert.create({
        type: 'EMAIL_FAILURE',
        severity: 'CRITICAL',
        message: `Email delivery failed for ${email} (${type}): ${details}`,
      }).catch(err => console.error('Failed to create email failure alert:', err));
    }
  } catch (err) {
    console.error('Failed to write to email log:', err);
  }
};

const sendSmtpEmail = async ({ to, subject, html, text, type = 'generic', metadata = {} }) => {
  const transporter = getSmtpTransporter();
  const from = getSmtpFrom();

  try {
    const result = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });

    await writeEmailLog(to, 'SUCCESS', type, `MessageId: ${result.messageId}`);

    return {
      delivered: true,
      mode: 'smtp',
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response,
      metadata,
      type,
    };
  } catch (error) {
    await writeEmailLog(to, 'FAILED', type, `Error: ${error.message}`);
    throw error;
  }
};

const sendEmail = async ({ to, subject, html, text, type = 'generic', metadata = {} }) => {
  const mode = getEmailMode();

  if (mode === 'disabled') {
    return {
      delivered: false,
      mode,
      skipped: true,
    };
  }

  if (mode === 'smtp') {
    return sendSmtpEmail({ to, subject, html, text, type, metadata });
  }

  return writeEmailToOutbox({
    to,
    subject,
    html,
    text,
    type,
    metadata,
  });
};

const sendInviteEmail = async ({ firstName, lastName, email, role, loginUrl }) => {
  const emailPayload = buildInviteEmail({ firstName, lastName, email, role, activationUrl: loginUrl });

  return sendEmail({
    to: email,
    subject: emailPayload.subject,
    html: emailPayload.html,
    text: emailPayload.text,
    type: 'invite',
    metadata: { role, loginUrl },
  });
};

const sendPasswordResetEmail = async ({ firstName, lastName, email, resetToken, resetUrl, mode = 'reset' }) => {
  const emailPayload = buildPasswordResetEmail({ firstName, lastName, email, resetToken, resetUrl, mode });

  return sendEmail({
    to: email,
    subject: emailPayload.subject,
    html: emailPayload.html,
    text: emailPayload.text,
    type: 'password-reset',
    metadata: {},
  });
};

const sendPasswordChangedEmail = async ({ firstName, lastName, email }) => {
  const emailPayload = buildPasswordChangedEmail({ firstName, lastName, email });

  return sendEmail({
    to: email,
    subject: emailPayload.subject,
    html: emailPayload.html,
    text: emailPayload.text,
    type: 'password-changed',
    metadata: {},
  });
};

const sendPrescriptionNotificationEmail = async ({
  to,
  rxId,
  patientName,
  doctorName,
  isUrgent,
}) => {
  const emailPayload = buildPrescriptionNotificationEmail({
    rxId,
    patientName,
    doctorName,
    isUrgent,
  });

  return sendEmail({
    to,
    subject: emailPayload.subject,
    html: emailPayload.html,
    text: emailPayload.text,
    type: 'prescription-notification',
    metadata: { rxId, isUrgent },
  });
};

module.exports = {
  sendEmail,
  sendInviteEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendPrescriptionNotificationEmail
};
