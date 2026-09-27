const express = require('express');
const { protect } = require('../middleware/auth');
const { getSettings, updateSettings, sendTestReminder } = require('../controllers/settingsController');
const router = express.Router();
router.use(protect);
router.route('/').get(getSettings).put(updateSettings);
router.post('/test-reminder', sendTestReminder);
module.exports = router;
