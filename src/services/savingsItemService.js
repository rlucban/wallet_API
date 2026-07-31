const savingsItemRepository = require('../repositories/savingsItemRepository');
const AppError = require('../utils/AppError');

const savingsItemService = {
  getAllItems: async (userId) => {
    return await savingsItemRepository.findAll(userId);
  },

  getItemById: async (id, userId) => {
    const item = await savingsItemRepository.findById(id, userId);
    if (!item) {
      throw new AppError('Savings item not found or you do not have permission to view it', 404);
    }
    return item;
  },

  createItem: async (userId, itemData) => {
    const newItem = {
      ...itemData,
      userId
    };
    if (itemData.id) newItem.id = itemData.id;

    const created = await savingsItemRepository.create(newItem);
    if (!created) {
      throw new AppError('Failed to create savings item', 500);
    }
    return created;
  },

  updateItem: async (id, userId, updateData) => {
    const existing = await savingsItemRepository.findById(id, userId);
    if (!existing) {
      throw new AppError('Savings item not found or you do not have permission to modify it', 404);
    }

    delete updateData.id;
    delete updateData.userId;

    const updated = await savingsItemRepository.update(id, userId, updateData);
    if (!updated) {
      throw new AppError('Failed to update savings item', 500);
    }
    return updated;
  },

  deleteItem: async (id, userId) => {
    const existing = await savingsItemRepository.findById(id, userId);
    if (!existing) {
      throw new AppError('Savings item not found or you do not have permission to delete it', 404);
    }

    return await savingsItemRepository.delete(id, userId);
  }
};

module.exports = savingsItemService;
