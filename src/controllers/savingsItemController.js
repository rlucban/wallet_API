const savingsItemService = require('../services/savingsItemService');

const savingsItemController = {
  getItems: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const items = await savingsItemService.getAllItems(userId);

      res.status(200).json({
        status: 'success',
        results: items.length,
        data: { savingsItems: items }
      });
    } catch (error) {
      next(error);
    }
  },

  getItem: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const { id } = req.params;

      const item = await savingsItemService.getItemById(id, userId);

      res.status(200).json({
        status: 'success',
        data: { savingsItem: item }
      });
    } catch (error) {
      next(error);
    }
  },

  createItem: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const itemData = req.body;

      const item = await savingsItemService.createItem(userId, itemData);

      res.status(201).json({
        status: 'success',
        data: { savingsItem: item }
      });
    } catch (error) {
      next(error);
    }
  },

  updateItem: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const { id } = req.params;
      const updateData = req.body;

      const item = await savingsItemService.updateItem(id, userId, updateData);

      res.status(200).json({
        status: 'success',
        data: { savingsItem: item }
      });
    } catch (error) {
      next(error);
    }
  },

  deleteItem: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const { id } = req.params;

      await savingsItemService.deleteItem(id, userId);

      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = savingsItemController;
