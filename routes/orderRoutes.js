const express = require('express');
const { protect } = require('../middleware/auth');
const { createOrder, getOrder, updateOrder, deleteOrder } = require('../controllers/orderController');

const router = express.Router();
router.use(protect);
router.post('/', createOrder);
router.get('/:id', getOrder);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);
module.exports = router;
