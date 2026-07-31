const transactionRepository = require('../repositories/transactionRepository');
const AppError = require('../utils/AppError');

const transactionService = {
  getAllTransactions: async (userId, filters) => {
    return await transactionRepository.findAll(userId, filters);
  },

  getTransactionById: async (id, userId) => {
    const transaction = await transactionRepository.findById(id, userId);
    if (!transaction) {
      throw new AppError('Transaction not found or you do not have permission to view it', 404);
    }
    return transaction;
  },

  createTransaction: async (userId, transactionData) => {
    const newTransaction = {
      ...transactionData,
      userId
    };

    const created = await transactionRepository.create(newTransaction);
    if (!created) {
      throw new AppError('Failed to create transaction', 500);
    }
    return created;
  },

  updateTransaction: async (id, userId, updateData) => {
    const existing = await transactionRepository.findById(id, userId);
    if (!existing) {
      throw new AppError('Transaction not found or you do not have permission to modify it', 404);
    }

    delete updateData.id;
    delete updateData.userId;

    const updated = await transactionRepository.update(id, userId, updateData);
    if (!updated) {
      throw new AppError('Failed to update transaction', 500);
    }
    return updated;
  },

  deleteTransaction: async (id, userId) => {
    const existing = await transactionRepository.findById(id, userId);
    if (!existing) {
      throw new AppError('Transaction not found or you do not have permission to delete it', 404);
    }

    const deleted = await transactionRepository.delete(id, userId);
    return deleted;
  },

  /**
   * 🔥 NEW: Sync Transactions (UPSERT behavior)
   */
  syncTransactions: async (userId, transactions) => {
    if (!Array.isArray(transactions)) {
      throw new AppError('Transactions must be an array', 400);
    }

    for (const tx of transactions) {
      if (!tx.id) continue; // Skip invalid records

      const existing = await transactionRepository.findById(tx.id, userId);

      // Clean up frontend specific payload
      const dbTx = { ...tx };
      
      if (dbTx.category && dbTx.category.id) {
        dbTx.categoryId = dbTx.category.id;
      }
      
      if (dbTx.title) {
        dbTx.note = dbTx.note ? `${dbTx.title} - ${dbTx.note}` : dbTx.title;
      }

      delete dbTx.category;
      delete dbTx.title;

      if (existing) {
        // Prevent overwriting protected fields
        delete dbTx.id;
        delete dbTx.userId;

        await transactionRepository.update(tx.id, userId, dbTx);
      } else {
        dbTx.userId = userId;

        await transactionRepository.create(dbTx);
      }
    }

    // Return authoritative server copy
    return await transactionRepository.findAll(userId);
  }
};

module.exports = transactionService;