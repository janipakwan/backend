const mongoose = require('mongoose');
const Expense = require('../models/Expense');

exports.listExpenses = async (req, res, next) => {
  try { 
    let query = {};
    if (req.query.date) {
      const start = new Date(req.query.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: start, $lt: end };
    }
    res.json({ expenses: await Expense.find(query).sort({ date: -1, createdAt: -1 }) }); 
  } catch (error) { next(error); }
};

exports.createExpense = async (req, res, next) => {
  try {
    let description = req.body.description?.trim() || '';
    let items = req.body.items || [];
    let amount = 0;

    const paidBy = req.body.paidBy || 'sale';
    const type = req.body.type || 'expense';

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
      if (!description) {
        description = type === 'income' ? 'Amdan (Income)' : 'Kharch';
      }
    }
    const date = req.body.date ? new Date(req.body.date) : new Date();
    if (!Number.isFinite(amount) || amount <= 0 || Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Valid amount and date are required.' });
    }

    const expense = await Expense.create({
      description,
      items,
      amount,
      type,
      paidBy: 'sale',
      date
    });

    res.status(201).json({ expense });
  } catch (error) { next(error); }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });

    let items = req.body.items || [];
    let amount = 0;
    if (items.length > 0) {
      items.forEach(item => { item.price = Number(item.price); item.quantity = Number(item.quantity) || 1; amount += item.price * item.quantity; });
    } else {
      amount = Number(req.body.amount) || expense.amount;
    }

    expense.description = req.body.description?.trim() ?? expense.description;
    expense.items = items.length > 0 ? items : expense.items;
    expense.amount = amount || expense.amount;
    expense.type = req.body.type || expense.type;
    expense.paidBy = 'sale';
    expense.date = req.body.date ? new Date(req.body.date) : expense.date;
    await expense.save();
    res.json({ expense });
  } catch (error) { next(error); }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });
    res.json({ message: 'Deleted successfully.' });
  } catch (error) { next(error); }
};

