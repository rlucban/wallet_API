const express = require('express');
const savingsItemController = require('../controllers/savingsItemController');
const validate = require('../middlewares/validate');
const { createSavingsItemSchema, updateSavingsItemSchema } = require('../schemas/savingsItemSchema');
const protect = require('../middlewares/protect');

const router = express.Router();

router.use(protect);

router.get('/', savingsItemController.getItems);
router.post('/', validate(createSavingsItemSchema), savingsItemController.createItem);
router.get('/:id', savingsItemController.getItem);
router.put('/:id', validate(updateSavingsItemSchema), savingsItemController.updateItem);
router.delete('/:id', savingsItemController.deleteItem);

module.exports = router;
