const dueService = require('../services/dueService');

const dueController = {
  getDues: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        completed: req.query.completed === 'true' ? true : req.query.completed === 'false' ? false : undefined
      };

      const dues = await dueService.getAllDues(userId, filters);

      res.status(200).json({
        status: 'success',
        results: dues.length,
        data: { dues }
      });
    } catch (error) {
      next(error);
    }
  },

  getDue: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const { id } = req.params;

      const due = await dueService.getDueById(id, userId);

      res.status(200).json({
        status: 'success',
        data: { due }
      });
    } catch (error) {
      next(error);
    }
  },

  createDue: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const dueData = req.body;

      const due = await dueService.createDue(userId, dueData);

      res.status(201).json({
        status: 'success',
        data: { due }
      });
    } catch (error) {
      next(error);
    }
  },

  updateDue: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const { id } = req.params;
      const updateData = req.body;

      const due = await dueService.updateDue(id, userId, updateData);

      res.status(200).json({
        status: 'success',
        data: { due }
      });
    } catch (error) {
      next(error);
    }
  },

  deleteDue: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const { id } = req.params;

      await dueService.deleteDue(id, userId);

      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = dueController;
