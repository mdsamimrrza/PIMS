const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const csurf = require('csurf');
const router = require('./routes/index');
const { errorHandler, notFound } = require('./middlewares/error.middleware');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const { csrfProtection } = require('./middlewares/csrf.middleware');

const app = express();
const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const configuredSecureCookie = process.env.SESSION_COOKIE_SECURE;
const useSecureCookie = typeof configuredSecureCookie === 'string'
  ? configuredSecureCookie === 'true'
  : isProduction;
const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'pims.sid';
const sessionMaxAge = Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 7);
const trustProxy = String(process.env.TRUST_PROXY || '').trim();

if (trustProxy) {
  app.set('trust proxy', trustProxy === 'true' ? 1 : trustProxy);
}

const trustProxyValue = app.get('trust proxy');
const useTrustProxy = Boolean(trustProxyValue);

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
      .split(',')
      .map(url => url.trim().replace(/\/$/, ''));

      const normalizedOrigin = origin ? origin.replace(/\/$/, '') : null;

      // In production, require an explicit origin; reject requests without an origin header
      if (isProduction && !normalizedOrigin) {
        return callback(new Error('Not allowed by CORS'));
      }

      if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(helmet());

// Content Security Policy — restrict resources to same origin and configured client
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'", 'http://localhost:5173', 'http://localhost:5174'],
    frameAncestors: ["'self'"],
    objectSrc: ["'none'"],
  }
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(session({
  name: sessionCookieName,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: false,
  proxy: useTrustProxy,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: Math.ceil(sessionMaxAge / 1000),
  }),
  cookie: {
    httpOnly: true,
    secure: useSecureCookie,
    sameSite: 'strict',
    maxAge: sessionMaxAge,
  },
}));

app.use(apiLimiter);

// CSRF token middleware (session-backed)
app.use(csurf());

// Expose CSRF token for SPA clients. Client should fetch this and send in
// `x-csrf-token` header for mutating requests.
app.get('/api/csrf-token', (req, res) => {
  try {
    const token = req.csrfToken();
    return res.json({ success: true, data: { csrfToken: token } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate CSRF token' });
  }
});

app.use(csrfProtection);

app.use('/api', router);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
