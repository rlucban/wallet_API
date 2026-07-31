const express = require('express');
const profileController = require('../controllers/profileController');
const protect = require('../middlewares/protect');

const router = express.Router();

// all profile routes require authentication
router.use(protect);

router.get('/', profileController.getProfile);
router.get('/:userId', profileController.getProfile);
router.put('/:userId', profileController.updateProfile);

module.exports = router;
