const transactionService = require('../services/transactionService');

const transactionController = {
  syncTransactions: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const { transactions } = req.body;

      console.log(`[Sync] Request from User: ${userId}`);
      console.log(`[Sync] Transactions received: ${Array.isArray(transactions) ? transactions.length : typeof transactions}`);

      if (!userId) {
        return res.status(400).json({
          status: "fail",
          message: "User ID is required"
        });
      }

      if (!Array.isArray(transactions)) {
        return res.status(400).json({
          status: "fail",
          message: "Transactions must be an array"
        });
      }

      const synced = await transactionService.syncTransactions(userId, transactions);

      res.status(200).json({
        status: "success",
        results: synced.length,
        data: { transactions: synced }
      });

    } catch (error) {
      next(error);
    }
  },
  getTransactions: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      // Allow query parameters for filtering
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        type: req.query.type,
        categoryId: req.query.categoryId
      };

      const transactions = await transactionService.getAllTransactions(userId, filters);

      res.status(200).json({
        status: 'success',
        results: transactions.length,
        data: { transactions }
      });
    } catch (error) {
      next(error);
    }
  },

  getTransaction: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const { id } = req.params;

      const transaction = await transactionService.getTransactionById(id, userId);

      res.status(200).json({
        status: 'success',
        data: { transaction }
      });
    } catch (error) {
      next(error);
    }
  },

  createTransaction: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const transactionData = req.body;

      const transaction = await transactionService.createTransaction(userId, transactionData);

      res.status(201).json({
        status: 'success',
        data: { transaction }
      });
    } catch (error) {
      next(error);
    }
  },

  updateTransaction: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const { id } = req.params;
      const updateData = req.body;

      const transaction = await transactionService.updateTransaction(id, userId, updateData);

      res.status(200).json({
        status: 'success',
        data: { transaction }
      });
    } catch (error) {
      next(error);
    }
  },

  deleteTransaction: async (req, res, next) => {
    try {
      const userId = req.query.userId || req.user?.id;
      const { id } = req.params;

      await transactionService.deleteTransaction(id, userId);

      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = transactionController;
