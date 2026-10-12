const express = require('express');
const { protect } = require('../middleware/auth');
const { createOrder, getOrder, updateOrder, deleteOrder, addOrderToLedger } = require('../controllers/orderController');

const router = express.Router();
router.use(protect);
router.post('/', createOrder);
router.get('/:id', getOrder);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);
router.post('/:id/add-to-ledger', addOrderToLedger);
module.exports = router;
