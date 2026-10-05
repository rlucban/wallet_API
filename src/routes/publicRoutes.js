const express = require('express');
const publicController = require('../controllers/publicController');

const router = express.Router();

// Spec 02 FINAL (SPEC-API-02) — D-PUB-03
// Public route: deliberately NO `protect` middleware (CON-PUB-01).
// NOTE: public rate limiter attaches in front in D-PUB-04; mount
// `app.use('/api/public', publicRoutes)` also lands in D-PUB-04,
// so creating this file alone changes zero runtime behavior.

router.get('/users-transactions', publicController.getUsersTransactions);

module.exports = router;
