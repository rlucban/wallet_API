const express = require('express');
const systemController = require('../controllers/systemController');
const router = express.Router();

// Public health check and reset flag
router.get('/health', systemController.getHealth);
router.post('/reset', systemController.triggerReset);


module.exports = router;
