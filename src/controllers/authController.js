const authService = require('../services/authService');

const authController = {
  register: async (req, res, next) => {
    try {
      const { name, passcode, initialBalance } = req.body;
      const result = await authService.register(name, passcode, initialBalance);
      
      res.status(201).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  login: async (req, res, next) => {
    try {
      const { name, passcode, deviceId, force } = req.body;
      const result = await authService.login(name, passcode, deviceId, force);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },
  logout: async (req, res, next) => {
    try {
      if (req.user && req.user.id) {
        await authService.logout(req.user.id);
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  changePasscode: async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        throw new Error('User not found in request');
      }
      const { currentPasscode, newPasscode } = req.body;
      const message = await authService.changePasscode(req.user.id, currentPasscode, newPasscode);

      res.status(200).json({
        status: 'success',
        message
      });
    } catch (error) {
      next(error);
    }
  },

  deleteAccount: async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        throw new Error('User not found in request');
      }
      
      await authService.deleteAccount(req.user.id);

      res.status(200).json({
        status: 'success',
        message: 'Account deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;
