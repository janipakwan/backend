const express = require('express');
const { protect } = require('../middleware/auth');
const { getReports } = require('../controllers/reportController');
const router = express.Router();
router.get('/', protect, getReports);
module.exports = router;
