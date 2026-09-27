const express = require('express');
const { protect } = require('../middleware/auth');
const { listCustomers, createCustomer, getCustomer } = require('../controllers/customerController');

const router = express.Router();
router.use(protect);
router.route('/').get(listCustomers).post(createCustomer);
router.get('/:id', getCustomer);
module.exports = router;
