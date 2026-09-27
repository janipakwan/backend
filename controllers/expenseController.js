const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const OwnerAdvance = require('../models/OwnerAdvance');

exports.listExpenses = async (req, res, next) => {
  try { res.json({ expenses: await Expense.find().sort({ date: -1, createdAt: -1 }) }); } catch (error) { next(error); }
};

exports.createExpense = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const description = req.body.description?.trim();
    const amount = Number(req.body.amount);
    const paidBy = req.body.paidBy;
    const date = req.body.date ? new Date(req.body.date) : new Date();
    if (!description || !Number.isFinite(amount) || amount <= 0 || !['sale', 'owner_advance'].includes(paidBy) || Number.isNaN(date.getTime())) return res.status(400).json({ message: 'Description, a positive amount, source, and a valid date are required.' });
    let result;
    await session.withTransaction(async () => {
      let advance = null;
      if (paidBy === 'owner_advance') [advance] = await OwnerAdvance.create([{ amount, reason: description, date, status: 'pending', clearedAmount: 0 }], { session });
      const [expense] = await Expense.create([{ description, amount, paidBy, date, ownerAdvance: advance?._id || null }], { session });
      result = { expense, ownerAdvance: advance };
    });
    res.status(201).json(result);
  } catch (error) { next(error); } finally { await session.endSession(); }
};
