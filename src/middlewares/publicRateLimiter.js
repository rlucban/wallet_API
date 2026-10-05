const rateLimit = require('express-rate-limit');

// Spec 02 FINAL (SPEC-API-02) — D-PUB-04, DEC-PUB-04 CONFIRMED.
// Public read-only throttle: 60 requests / 15 min / IP, separate from authRateLimiter.
// Reuses express-rate-limit@7 (CON-PUB-10, no new dependency).

const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: 'fail',
      message: 'Too many requests, try again later',
    });
  },
});

module.exports = publicRateLimiter;
