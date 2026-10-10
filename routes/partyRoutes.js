const express = require('express');
const { protect } = require('../middleware/auth');
const { getParties, createParty, getPartyDetail, addTransaction, updateParty, deleteParty, deleteTransaction, updateTransaction } = require('../controllers/partyController');

const router = express.Router();
router.use(protect);

router.route('/').get(getParties).post(createParty);
router.route('/:id').get(getPartyDetail).put(updateParty).delete(deleteParty);
router.route('/:id/transactions').post(addTransaction);
router.route('/:id/transactions/:txnId').put(updateTransaction).delete(deleteTransaction);

module.exports = router;
