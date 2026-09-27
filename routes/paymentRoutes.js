const express = require('express');
const { protect } = require('../middleware/auth');
const { listOutstandingOrders, createPayment, deletePayment } = require('../controllers/paymentController');
const router = express.Router();
router.use(protect);
router.get('/outstanding', listOutstandingOrders);
router.post('/order/:orderId', createPayment);
router.delete('/:id', deletePayment);
module.exports = router;
