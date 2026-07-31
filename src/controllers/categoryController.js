const categoryService = require('../services/categoryService');

const categoryController = {
  getCategories: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      // Default to true, allow ?includeGlobal=false to hide them
      const includeGlobal = req.query.includeGlobal !== 'false';

      const categories = await categoryService.getAllCategories(userId, includeGlobal);

      res.status(200).json({
        status: 'success',
        results: categories.length,
        data: { categories }
      });
    } catch (error) {
      next(error);
    }
  },

  createCategory: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const categoryData = req.body;

      const category = await categoryService.createCategory(userId, categoryData);

      res.status(201).json({
        status: 'success',
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  },

  updateCategory: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const { id } = req.params;
      const updateData = req.body;

      const category = await categoryService.updateCategory(id, userId, updateData);

      res.status(200).json({
        status: 'success',
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  },

  deleteCategory: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const { id } = req.params;

      await categoryService.deleteCategory(id, userId);

      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = categoryController;
