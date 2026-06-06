const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');

const getAllowedOrigins = () =>
  String(process.env.CLIENT_URL || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

const csrfProtection = (req, res, next) => {
  if (String(process.env.NODE_ENV || '').trim().toLowerCase() === 'test') {
    return next();
  }

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const origin = normalizeOrigin(req.headers.origin);
  let referer = '';
  try {
    referer = normalizeOrigin(req.headers.referer ? new URL(req.headers.referer).origin : '');
  } catch {
    referer = '';
  }
  const allowedOrigins = getAllowedOrigins();

  if ((origin && allowedOrigins.includes(origin)) || (referer && allowedOrigins.includes(referer))) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Request origin not allowed',
  });
};

module.exports = {
  csrfProtection
};
