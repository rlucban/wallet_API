const express = require('express');
const router = express.Router();
const paymentMethodsRepository = require('../repositories/paymentMethodsRepository');

/**
 * @route GET /api/payment-methods
 * @desc Get all available payment methods
 * @access Public (or Protected depending on auth middleware)
 */
router.get('/', async (req, res, next) => {
  try {
    const methods = await paymentMethodsRepository.findAll();
    res.status(200).json(methods);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
