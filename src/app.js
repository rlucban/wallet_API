const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const dueRoutes = require('./routes/dueRoutes');
const savingsItemRoutes = require('./routes/savingsItemRoutes');
const paymentMethodRoutes = require('./routes/paymentMethodRoutes');
const storageRoutes = require('./routes/storageRoutes');
const systemRoutes = require('./routes/systemRoutes');
const publicRoutes = require('./routes/publicRoutes');
const publicRateLimiter = require('./middlewares/publicRateLimiter');

// Spec 02 FINAL (SPEC-API-02) — D-PUB-04: exact-origin allow for the public web app.
const PUBLIC_WEB_ORIGIN = 'https://wise-wallet-sage.vercel.app';

app.use('/api/auth', authRoutes);
app.use('/api/userProfiles', profileRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dues', dueRoutes);
app.use('/api/savingsItems', savingsItemRoutes);
app.use('/api/paymentMethods', paymentMethodRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/system', systemRoutes);
// Spec 02 FINAL (SPEC-API-02) — D-PUB-04: public read-only mount (append-only).
// Scoped CORS (exact origin, GET-only) + 60/15min/IP throttle in front of the router.
// removeHeader clears the global cors() wildcard so evil origins get no ACAO (ACC-PUB-05).
app.use(
  '/api/public',
  (req, res, next) => {
    res.removeHeader('Access-Control-Allow-Origin');
    next();
  },
  cors({
    origin: PUBLIC_WEB_ORIGIN,
    methods: ['GET'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86400,
  }),
  publicRateLimiter,
  publicRoutes
);
// Health check endpoint (legacy - now handled by /system/health)
app.get('/api/health', (req, res) => {
  res.redirect('/api/system/health');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global Error Handler caught:", err);

  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  res.status(statusCode).json({
    status: status,
    message: err.message || 'Internal Server Error',
    errorDetails: err,
    stack: err.stack
  });
});

module.exports = app;
