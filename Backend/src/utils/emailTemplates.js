const buildInviteEmail = ({ firstName, lastName, email, role, activationUrl, expiresIn = '1 hour' }) => {
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || email;
  const html = `
    <h1>PIMS Account Created</h1>
    <p>Hello ${displayName},</p>
    <p>Your PIMS account is ready.</p>
    <ul>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Role:</strong> ${role}</li>
    </ul>
    <p>Set your password using the secure activation link below. This link expires in ${expiresIn}.</p>
    ${activationUrl ? `<p><a href="${activationUrl}">${activationUrl}</a></p>` : ''}
  `.trim();

  const text = [
    'PIMS Account Created',
    `Hello ${displayName},`,
    `Email: ${email}`,
    `Role: ${role}`,
    activationUrl ? `Activation link: ${activationUrl}` : null,
    `Set your password using the secure activation link above. It expires in ${expiresIn}.`,
  ].filter(Boolean).join('\n');

  return {
    subject: 'Your PIMS account is ready',
    html,
    text,
  };
};

const buildPasswordResetEmail = ({ firstName, lastName, email, resetToken, resetUrl, mode = 'reset' }) => {
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || email;
  const heading = mode === 'activation' ? 'Activate Your PIMS Account' : 'Reset Your PIMS Password';
  const intro = mode === 'activation'
    ? 'Use the link below or enter the one-time code in the UI to set your password:'
    : 'Use the link below or enter the one-time code in the UI:';
  const html = `
    <h1>${heading}</h1>
    <p>Hello ${displayName},</p>
    <p>${intro}</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p><strong>Reset code:</strong> ${resetToken}</p>
    <p>This code expires soon. If you did not request a password reset, ignore this email.</p>
  `.trim();

  const text = [
    heading,
    `Hello ${displayName},`,
    `Reset link: ${resetUrl}`,
    `Reset code: ${resetToken}`,
    'This code expires soon. If you did not request a password reset, ignore this email.',
  ].join('\n');

  return {
    subject: mode === 'activation' ? 'Activate your PIMS account' : 'Reset your PIMS password',
    html,
    text,
  };
};

const buildPasswordChangedEmail = ({ firstName, lastName, email }) => {
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || email;
  const html = `
    <h1>PIMS Password Changed</h1>
    <p>Hello ${displayName},</p>
    <p>Your PIMS password was changed successfully.</p>
    <p>If you did not make this change, contact an administrator immediately.</p>
  `.trim();

  const text = [
    'PIMS Password Changed',
    `Hello ${displayName},`,
    'Your PIMS password was changed successfully.',
    'If you did not make this change, contact an administrator immediately.',
  ].join('\n');

  return {
    subject: 'Your PIMS password was changed',
    html,
    text,
  };
};

const buildPrescriptionNotificationEmail = ({
  rxId,
  patientName,
  doctorName,
  isUrgent,
}) => {
  const priority = isUrgent ? 'Urgent' : 'Standard';

  const html = `
    <h1>New Prescription Submitted</h1>
    <p>A new prescription has been submitted in PIMS.</p>
    <ul>
      <li><strong>Rx ID:</strong> ${rxId}</li>
      <li><strong>Patient:</strong> ${patientName}</li>
      <li><strong>Doctor:</strong> ${doctorName}</li>
      <li><strong>Priority:</strong> ${priority}</li>
    </ul>
    <p>Please review it in the pharmacist workflow.</p>
  `.trim();

  const text = [
    'New Prescription Submitted',
    `Rx ID: ${rxId}`,
    `Patient: ${patientName}`,
    `Doctor: ${doctorName}`,
    `Priority: ${priority}`,
    'Please review it in the pharmacist workflow.',
  ].join('\n');

  return {
    subject: `Prescription ${rxId} submitted`,
    html,
    text,
  };
};

module.exports = {
  buildInviteEmail,
  buildPasswordResetEmail,
  buildPasswordChangedEmail,
  buildPrescriptionNotificationEmail
};
