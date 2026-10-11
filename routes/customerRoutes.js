const express = require('express');
const { protect } = require('../middleware/auth');
const {
  listCustomers,
  createCustomer,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerTransaction,
  updateCustomerTransaction,
  deleteCustomerTransaction
} = require('../controllers/customerController');

const router = express.Router();
router.use(protect);

router.route('/').get(listCustomers).post(createCustomer);
router.route('/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);
router.route('/:id/transactions').post(addCustomerTransaction);
router.route('/:id/transactions/:txnId').put(updateCustomerTransaction).delete(deleteCustomerTransaction);

module.exports = router;
