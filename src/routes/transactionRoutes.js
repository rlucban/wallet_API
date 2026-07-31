const express = require('express');
const transactionController = require('../controllers/transactionController');
const validate = require('../middlewares/validate');
const { createTransactionSchema, updateTransactionSchema } = require('../schemas/transactionSchema');
const protect = require('../middlewares/protect');

const router = express.Router();

// All transaction routes require authentication
router.use(protect);

router.get('/', transactionController.getTransactions);
router.post('/', validate(createTransactionSchema), transactionController.createTransaction);
router.get('/:id', transactionController.getTransaction);
router.put('/:id', validate(updateTransactionSchema), transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

router.post('/sync', transactionController.syncTransactions);

module.exports = router;
