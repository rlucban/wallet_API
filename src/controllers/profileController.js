const profileService = require('../services/profileService');

const profileController = {
  getProfile: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.params.userId || req.user?.id;
      const profile = await profileService.getProfile(userId);

      res.status(200).json({
        status: 'success',
        data: { profile }
      });
    } catch (error) {
      next(error);
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.params.userId || req.user?.id;
      const updateData = req.body;
      
      const profile = await profileService.updateProfile(userId, updateData);

      res.status(200).json({
        status: 'success',
        data: { profile }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = profileController;
