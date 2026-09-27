const express = require('express');
const { protect } = require('../middleware/auth');
const { listAdvances, clearAdvance } = require('../controllers/ownerAdvanceController');
const router = express.Router();
router.use(protect);
router.get('/', listAdvances);
router.post('/:id/clear', clearAdvance);
module.exports = router;
