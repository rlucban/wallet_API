const express = require('express');
const storageController = require('../controllers/storageController');
const protect = require('../middlewares/protect');

const router = express.Router();

router.use(protect);
router.post('/upload', storageController.uploadFile);

module.exports = router;
