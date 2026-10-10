const express = require('express');
const { protect } = require('../middleware/auth');
const { listCustomers, createCustomer, getCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController');

const router = express.Router();
router.use(protect);
router.route('/').get(listCustomers).post(createCustomer);
router.route('/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);
module.exports = router;
