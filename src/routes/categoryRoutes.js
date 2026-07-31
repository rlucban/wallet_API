const express = require('express');
const categoryController = require('../controllers/categoryController');
const validate = require('../middlewares/validate');
const { createCategorySchema, updateCategorySchema } = require('../schemas/categorySchema');
const protect = require('../middlewares/protect');

const router = express.Router();

// router.use(protect);

router.get('/', categoryController.getCategories);
router.post('/', validate(createCategorySchema), categoryController.createCategory).use(protect);
router.put('/:id', validate(updateCategorySchema), categoryController.updateCategory).use(protect);
router.delete('/:id', categoryController.deleteCategory).use(protect);

module.exports = router;
