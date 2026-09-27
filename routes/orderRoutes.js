const express = require('express');
const { protect } = require('../middleware/auth');
const { createOrder, getOrder } = require('../controllers/orderController');

const router = express.Router();
router.use(protect);
router.post('/', createOrder);
router.get('/:id', getOrder);
module.exports = router;
