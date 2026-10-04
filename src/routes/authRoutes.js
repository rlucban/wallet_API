const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middlewares/validate');
const { registerSchema, loginSchema, changePasscodeSchema } = require('../schemas/userSchema');
const protect = require('../middlewares/protect');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', protect, authController.logout);
router.delete('/account', protect, authController.deleteAccount);
router.post('/change-passcode', protect, validate(changePasscodeSchema), authController.changePasscode);

module.exports = router;
