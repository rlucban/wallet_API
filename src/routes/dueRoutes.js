const express = require('express');
const dueController = require('../controllers/dueController');
const validate = require('../middlewares/validate');
const { createDueSchema, updateDueSchema } = require('../schemas/dueSchema');
const protect = require('../middlewares/protect');

const router = express.Router();

router.use(protect);

router.get('/', dueController.getDues);
router.post('/', validate(createDueSchema), dueController.createDue);
router.get('/:id', dueController.getDue);
router.put('/:id', validate(updateDueSchema), dueController.updateDue);
router.delete('/:id', dueController.deleteDue);

module.exports = router;
