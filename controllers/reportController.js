const Order = require('../models/Order');
const Expense = require('../models/Expense');

function keyForDate(date, period) {
  const value = new Date(date);
  if (period === 'monthly') {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }
  if (period === 'weekly') {
    const monday = new Date(value);
    const offset = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - offset);
    return monday.toISOString().slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function summarize(items, field, period, dateField = 'orderDate') {
  const values = new Map();
  for (const item of items) {
    const rawDate = item[dateField] || item.orderDate || item.date || item.createdAt;
    if (!rawDate) continue;
    const key = keyForDate(rawDate, period);
    values.set(key, (values.get(key) || 0) + Number(item[field] || 0));
  }
  return [...values.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, amount]) => ({ label, amount }));
}

function buildComparison(salesSeries, expenseSeries) {
  const labels = new Set([
    ...salesSeries.map((s) => s.label),
    ...expenseSeries.map((e) => e.label)
  ]);
  const salesMap = new Map(salesSeries.map((s) => [s.label, s.amount]));
  const expenseMap = new Map(expenseSeries.map((e) => [e.label, e.amount]));

  return [...labels]
    .sort((a, b) => a.localeCompare(b))
    .map((label) => {
      const sales = salesMap.get(label) || 0;
      const expenses = expenseMap.get(label) || 0;
      return {
        label,
        sales,
        expenses,
        net: sales - expenses
      };
    });
}

exports.getReports = async (req, res, next) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const [orders, expenses, allDueOrders] = await Promise.all([
      Order.find({ orderDate: { $gte: start } }).select('orderDate totalAmount dueAmount'),
      Expense.find({ date: { $gte: start } }).select('date amount paidBy'),
      Order.find({ dueAmount: { $gt: 0 } }).select('dueAmount')
    ]);

    const sales = orders.reduce((total, order) => total + Number(order.totalAmount || 0), 0);
    const expenseTotal = expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
    const totalOutstandingDues = allDueOrders.reduce((total, order) => total + Number(order.dueAmount || 0), 0);

    const dailySales = summarize(orders, 'totalAmount', 'daily', 'orderDate');
    const weeklySales = summarize(orders, 'totalAmount', 'weekly', 'orderDate');
    const monthlySales = summarize(orders, 'totalAmount', 'monthly', 'orderDate');

    const dailyExpenses = summarize(expenses, 'amount', 'daily', 'date');
    const weeklyExpenses = summarize(expenses, 'amount', 'weekly', 'date');
    const monthlyExpenses = summarize(expenses, 'amount', 'monthly', 'date');

    const dailyComparison = buildComparison(dailySales, dailyExpenses);
    const weeklyComparison = buildComparison(weeklySales, weeklyExpenses);
    const monthlyComparison = buildComparison(monthlySales, monthlyExpenses);

    res.json({
      rangeDays: days,
      dailySales,
      weeklySales,
      monthlySales,
      dailyComparison,
      weeklyComparison,
      monthlyComparison,
      overview: {
        sales,
        expenses: expenseTotal,
        net: sales - expenseTotal,
        totalOutstandingDues
      }
    });
  } catch (error) {
    next(error);
  }
};
