const requiredEnv = [
  'PORT',
  'NODE_ENV',
  'MONGO_URI',
  'CLIENT_URL',
];

const validateEnv = () => {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  const emailMode = String(process.env.EMAIL_MODE || 'file').trim().toLowerCase();
  const adminSetupEnabled = String(process.env.ENABLE_ADMIN_SETUP || 'false').trim().toLowerCase() === 'true';

  if (emailMode === 'smtp') {
    const smtpRequiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    missing.push(...smtpRequiredEnv.filter((key) => !process.env[key]));
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error('Missing required environment variables: SESSION_SECRET');
  }

  if (adminSetupEnabled && !process.env.ADMIN_SETUP_TOKEN) {
    throw new Error('Missing required environment variables: ADMIN_SETUP_TOKEN');
  }

  if (process.env.ADMIN_SETUP_TOKEN && process.env.ADMIN_SETUP_TOKEN.length < 24) {
    throw new Error('ADMIN_SETUP_TOKEN must be at least 24 characters long');
  }

  if (isProduction) {
    const secureCookie = String(process.env.SESSION_COOKIE_SECURE || '').trim().toLowerCase();
    if (secureCookie && secureCookie !== 'true') {
      throw new Error('SESSION_COOKIE_SECURE must be true in production');
    }

    if (String(process.env.BOOTSTRAP_DEMO_USERS || 'false').trim().toLowerCase() === 'true') {
      throw new Error('BOOTSTRAP_DEMO_USERS cannot be enabled in production');
    }
  }
};

module.exports = { validateEnv };
