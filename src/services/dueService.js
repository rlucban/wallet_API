const dueRepository = require('../repositories/dueRepository');
const AppError = require('../utils/AppError');

const dueService = {
  getAllDues: async (userId, filters) => {
    return await dueRepository.findAll(userId, filters);
  },

  getDueById: async (id, userId) => {
    const due = await dueRepository.findById(id, userId);
    if (!due) {
      throw new AppError('Due not found or you do not have permission to view it', 404);
    }
    return due;
  },

  createDue: async (userId, dueData) => {
    const newDue = {
      ...dueData,
      userId
    };

    const created = await dueRepository.create(newDue);
    if (!created) {
      throw new AppError('Failed to create due', 500);
    }
    return created;
  },

  updateDue: async (id, userId, updateData) => {
    const existing = await dueRepository.findById(id, userId);
    
    if (!existing) {
      return await dueService.createDue(userId, { ...updateData, id });
    }

    delete updateData.id;
    delete updateData.userId;

    const updated = await dueRepository.update(id, userId, updateData);
    if (!updated) {
      throw new AppError('Failed to update due', 500);
    }
    return updated;
  },

  deleteDue: async (id, userId) => {
    const existing = await dueRepository.findById(id, userId);
    if (!existing) {
      throw new AppError('Due not found or you do not have permission to delete it', 404);
    }

    return await dueRepository.delete(id, userId);
  }
};

module.exports = dueService;
