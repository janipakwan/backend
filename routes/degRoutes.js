const express = require('express');
const { protect } = require('../middleware/auth');
const { listDegs, createDeg, updateDeg } = require('../controllers/degController');

const router = express.Router();
router.use(protect);
router.route('/').get(listDegs).post(createDeg);
router.put('/:id', updateDeg);
module.exports = router;
