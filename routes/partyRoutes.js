const express = require('express');
const { protect } = require('../middleware/auth');
const { getParties, createParty, getPartyDetail, addTransaction } = require('../controllers/partyController');

const router = express.Router();
router.use(protect);

router.route('/').get(getParties).post(createParty);
router.route('/:id').get(getPartyDetail);
router.route('/:id/transactions').post(addTransaction);

module.exports = router;
