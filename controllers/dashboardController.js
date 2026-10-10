const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Party = require('../models/Party');
const Expense = require('../models/Expense');

exports.getDashboard = async (req, res, next) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [todayOrders, allOrders, customerCount, parties, allExpenses, todayExpenses] = await Promise.all([
      Order.find({ orderDate: { $gte: start, $lt: end } }).select('totalAmount dueAmount'),
      Order.find().select('dueAmount'),
      Customer.countDocuments(),
      Party.find({ balance: { $gt: 0 } }).select('name balance'),
      Expense.find().select('amount type description items date'),
      Expense.find({ date: { $gte: start, $lt: end } }).select('amount type description items')
    ]);

    const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0);

    const isIncome = (e) => e.type === 'income' || (!e.items?.length && (e.description?.toLowerCase().includes('income') || e.description?.toLowerCase().includes('amdan')));

    const totalAkhratjat = allExpenses.filter(e => !isIncome(e)).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalAmdan = allExpenses.filter(e => isIncome(e)).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const todayAkhratjat = todayExpenses.filter(e => !isIncome(e)).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const todayAmdan = todayExpenses.filter(e => isIncome(e)).reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const todaySales = sum(todayOrders, 'totalAmount');
    const todayNewDues = sum(todayOrders, 'dueAmount');
    const totalPendingDues = allOrders
      .filter((o) => Number(o.dueAmount) > 0)
      .reduce((total, o) => total + Number(o.dueAmount || 0), 0);

    const totalPartyPayable = sum(parties, 'balance');

    res.json({
      todaySales,
      todayNewDues,
      totalPendingDues,
      orderCount: allOrders.length,
      customerCount,
      totalPartyPayable,
      partiesToPay: parties,
      totalAkhratjat,
      totalAmdan,
      todayAkhratjat,
      todayAmdan
    });
  } catch (error) {
    next(error);
  }
};

