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

app.use('/api/auth', authRoutes);
app.use('/api/userProfiles', profileRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dues', dueRoutes);
app.use('/api/savingsItems', savingsItemRoutes);
app.use('/api/paymentMethods', paymentMethodRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/system', systemRoutes);
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
