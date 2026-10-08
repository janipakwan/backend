const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const OwnerAdvance = require('../models/OwnerAdvance');

exports.listExpenses = async (req, res, next) => {
  try { res.json({ expenses: await Expense.find().sort({ date: -1, createdAt: -1 }) }); } catch (error) { next(error); }
};

exports.createExpense = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const description = req.body.description?.trim() || '';
    let items = req.body.items || [];
    let amount = 0;

    if (items.length > 0) {
      items.forEach((item, idx) => {
        const qty = Number(item.quantity);
        const price = Number(item.price);
        if (!Number.isFinite(price) || price < 0) throw Object.assign(new Error(`Item ${idx + 1}: Price cannot be negative.`), { statusCode: 400 });
        if (!Number.isFinite(qty) || qty < 1) throw Object.assign(new Error(`Item ${idx + 1}: Quantity must be at least 1.`), { statusCode: 400 });
        item.quantity = qty;
        item.price = price;
        amount += price * qty;
      });
    } else {
      amount = Number(req.body.amount);
      if (!description) return res.status(400).json({ message: 'Description or items are required.' });
    }

    const paidBy = req.body.paidBy;
    const date = req.body.date ? new Date(req.body.date) : new Date();
    if (!Number.isFinite(amount) || amount <= 0 || !['sale', 'owner_advance'].includes(paidBy) || Number.isNaN(date.getTime())) return res.status(400).json({ message: 'Valid amount, source, and date are required.' });
    let result;
    await session.withTransaction(async () => {
      let advance = null;
      if (paidBy === 'owner_advance') {
        const advReason = description || (items.length > 0 ? items.map(i => i.name).join(', ') : 'Expense items');
        [advance] = await OwnerAdvance.create([{ amount, reason: advReason, date, status: 'pending', clearedAmount: 0 }], { session });
      }
      const [expense] = await Expense.create([{ description, items, amount, paidBy, date, ownerAdvance: advance?._id || null }], { session });
      result = { expense, ownerAdvance: advance };
    });
    res.status(201).json(result);
  } catch (error) { next(error); } finally { await session.endSession(); }
};
