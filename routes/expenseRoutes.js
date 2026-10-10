const express = require('express');
const { protect } = require('../middleware/auth');
const { listExpenses, createExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');
const router = express.Router();
router.use(protect);
router.route('/').get(listExpenses).post(createExpense);
router.route('/:id').put(updateExpense).delete(deleteExpense);
module.exports = router;
