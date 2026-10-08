const mongoose = require('mongoose');
const Party = require('../models/Party');
const PartyTransaction = require('../models/PartyTransaction');

exports.getParties = async (req, res, next) => {
  try {
    const parties = await Party.find().sort({ name: 1 });
    res.json({ parties });
  } catch (error) { next(error); }
};

exports.createParty = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Party name is required.' });
    const party = await Party.create({ name: name.trim(), phone: phone?.trim() });
    res.status(201).json({ party });
  } catch (error) { next(error); }
};

exports.getPartyDetail = async (req, res, next) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ message: 'Party not found.' });
    const transactions = await PartyTransaction.find({ party: party._id }).sort({ date: -1, createdAt: -1 });
    res.json({ party, transactions });
  } catch (error) { next(error); }
};

exports.addTransaction = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const partyId = req.params.id;
    const { type, details, date } = req.body;
    let items = req.body.items || [];
    let amt = 0;
    
    if (!['purchase', 'payment'].includes(type)) return res.status(400).json({ message: 'Invalid transaction type.' });

    if (type === 'purchase' && items.length > 0) {
      items.forEach((item, idx) => {
        const price = Number(item.price);
        if (!Number.isFinite(price) || price < 0) throw Object.assign(new Error(`Item ${idx + 1}: Price cannot be negative.`), { statusCode: 400 });
        item.price = price;
        amt += price;
      });
    } else {
      amt = Number(req.body.amount);
      items = [];
    }

    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'Valid amount or items with price are required.' });

    let updatedParty;
    let transaction;

    await session.withTransaction(async () => {
      const party = await Party.findById(partyId).session(session);
      if (!party) throw Object.assign(new Error('Party not found.'), { statusCode: 404 });

      transaction = await PartyTransaction.create([{
        party: party._id,
        type,
        items,
        amount: amt,
        details: details?.trim() || '',
        date: date ? new Date(date) : new Date()
      }], { session });

      // If purchase, balance increases (we owe them more). If payment, balance decreases.
      party.balance = party.balance + (type === 'purchase' ? amt : -amt);
      await party.save({ session });
      updatedParty = party;
    });

    res.status(201).json({ transaction: transaction[0], party: updatedParty });
  } catch (error) { next(error); } finally { await session.endSession(); }
};
