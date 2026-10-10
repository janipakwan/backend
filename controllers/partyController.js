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

exports.updateParty = async (req, res, next) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ message: 'Party not found.' });
    if (req.body.name) party.name = req.body.name.trim();
    if (req.body.phone !== undefined) party.phone = req.body.phone.trim();
    await party.save();
    res.json({ party });
  } catch (error) { next(error); }
};

exports.deleteParty = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const party = await Party.findByIdAndDelete(req.params.id).session(session);
      if (!party) throw Object.assign(new Error('Party not found.'), { statusCode: 404 });
      await PartyTransaction.deleteMany({ party: party._id }).session(session);
    });
    res.json({ message: 'Party deleted successfully.' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  } finally { await session.endSession(); }
};

exports.deleteTransaction = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let updatedParty;
    await session.withTransaction(async () => {
      const txn = await PartyTransaction.findByIdAndDelete(req.params.txnId).session(session);
      if (!txn) throw Object.assign(new Error('Transaction not found.'), { statusCode: 404 });
      // Recalculate party balance from remaining transactions
      const party = await Party.findById(txn.party).session(session);
      if (party) {
        const all = await PartyTransaction.find({ party: party._id }).session(session);
        party.balance = all.reduce((sum, t) => sum + (t.type === 'purchase' ? t.amount : -t.amount), 0);
        await party.save({ session });
        updatedParty = party;
      }
    });
    res.json({ message: 'Transaction deleted.', party: updatedParty });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  } finally { await session.endSession(); }
};

exports.updateTransaction = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let updatedParty;
    let updatedTxn;
    await session.withTransaction(async () => {
      const txn = await PartyTransaction.findById(req.params.txnId).session(session);
      if (!txn) throw Object.assign(new Error('Transaction not found.'), { statusCode: 404 });

      const type = req.body.type || txn.type;
      let items = req.body.items || [];
      let amt = 0;

      if (type === 'purchase' && items.length > 0) {
        items.forEach((item, idx) => {
          const price = Number(item.price);
          if (!Number.isFinite(price) || price < 0) throw Object.assign(new Error(`Item ${idx + 1}: Price cannot be negative.`), { statusCode: 400 });
          item.price = price;
          amt += price;
        });
      } else {
        amt = Number(req.body.amount !== undefined ? req.body.amount : txn.amount);
      }

      if (!['purchase', 'payment'].includes(type) || !Number.isFinite(amt) || amt <= 0) {
        throw Object.assign(new Error('Valid type and positive amount are required.'), { statusCode: 400 });
      }

      txn.type = type;
      txn.items = items;
      txn.amount = amt;
      if (req.body.details !== undefined) txn.details = req.body.details.trim();
      if (req.body.date) txn.date = new Date(req.body.date);
      await txn.save({ session });
      updatedTxn = txn;

      const party = await Party.findById(txn.party).session(session);
      if (party) {
        const all = await PartyTransaction.find({ party: party._id }).session(session);
        party.balance = all.reduce((sum, t) => sum + (t.type === 'purchase' ? t.amount : -t.amount), 0);
        await party.save({ session });
        updatedParty = party;
      }
    });

    res.json({ transaction: updatedTxn, party: updatedParty });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  } finally {
    await session.endSession();
  }
};


