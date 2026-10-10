const express = require('express');
const { login, me, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.post('/login', login);
router.get('/me', protect, me);
router.put('/change-password', protect, changePassword);

module.exports = router;

