const express = require('express');
const { protect } = require('../middleware/auth');
const { listExpenses, createExpense } = require('../controllers/expenseController');
const router = express.Router();
router.use(protect);
router.route('/').get(listExpenses).post(createExpense);
module.exports = router;
