const rateLimit = require('express-rate-limit');

// DEC-API-01: 20 attempts / 15 min / IP (Spec 01 CON-API-07)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: 'fail',
      message: 'Too many attempts, try again later'
    });
  }
});

module.exports = authRateLimiter;
