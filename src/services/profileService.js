const profileRepository = require('../repositories/profileRepository');
const AppError = require('../utils/AppError');

const profileService = {
  getProfile: async (userId) => {
    const profile = await profileRepository.findByUserId(userId);
    if (!profile) {
      throw new AppError('Profile not found', 404);
    }
    return profile;
  },

  updateProfile: async (userId, updateData) => {
    // Basic validation, ensure they don't overwrite user ID
    const allowedUpdates = { ...updateData };
    delete allowedUpdates.id;
    delete allowedUpdates.userId;

    const updatedProfile = await profileRepository.updateProfile(userId, allowedUpdates);
    if (!updatedProfile) {
      throw new AppError('Failed to update profile', 500);
    }
    return updatedProfile;
  }
};

module.exports = profileService;
