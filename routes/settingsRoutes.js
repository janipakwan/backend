const express = require('express');
const { protect } = require('../middleware/auth');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const router = express.Router();
router.use(protect);
router.route('/').get(getSettings).put(updateSettings);
module.exports = router;
