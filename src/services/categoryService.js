const categoryRepository = require('../repositories/categoryRepository');
const AppError = require('../utils/AppError');

const categoryService = {
  getAllCategories: async (userId, includeGlobal = true) => {
    return await categoryRepository.findAll(userId, includeGlobal);
  },

  createCategory: async (userId, categoryData) => {
    // Normal users can only create custom categories
    const newCategory = {
      ...categoryData,
      userId,
      isGlobal: false
    };

    const created = await categoryRepository.create(newCategory);
    if (!created) {
      throw new AppError('Failed to create category', 500);
    }
    return created;
  },

  updateCategory: async (id, userId, updateData) => {
    const existing = await categoryRepository.findById(id);

    if (!existing) {
      throw new AppError('Category not found', 404);
    }

    if (existing.isGlobal) {
      throw new AppError('Global categories cannot be modified', 403);
    }

    if (existing.userId !== userId) {
      throw new AppError('You do not have permission to modify this category', 403);
    }

    // Protect core fields
    delete updateData.id;
    delete updateData.userId;
    delete updateData.isGlobal;

    const updated = await categoryRepository.update(id, updateData);
    return updated;
  },

  deleteCategory: async (id, userId) => {
    const existing = await categoryRepository.findById(id);

    if (!existing) {
      throw new AppError('Category not found', 404);
    }

    if (existing.isGlobal) {
      throw new AppError('Global categories cannot be deleted', 403);
    }

    if (existing.userId !== userId) {
      throw new AppError('You do not have permission to delete this category', 403);
    }

    return await categoryRepository.delete(id);
  }
};

module.exports = categoryService;
