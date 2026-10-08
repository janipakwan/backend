const Order = require('../models/Order');
const Customer = require('../models/Customer');
const OwnerAdvance = require('../models/OwnerAdvance');
const Party = require('../models/Party');

exports.getDashboard = async (req, res, next) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [todayOrders, allOrders, customerCount, advances, parties] = await Promise.all([
      Order.find({ orderDate: { $gte: start, $lt: end } }).select('totalAmount dueAmount'),
      Order.find().select('dueAmount'),
      Customer.countDocuments(),
      OwnerAdvance.find({ status: 'pending' }).select('amount clearedAmount'),
      Party.find({ balance: { $gt: 0 } }).select('name balance')
    ]);

    const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0);

    const todaySales = sum(todayOrders, 'totalAmount');
    const todayNewDues = sum(todayOrders, 'dueAmount');
    const totalPendingDues = allOrders
      .filter((o) => Number(o.dueAmount) > 0)
      .reduce((total, o) => total + Number(o.dueAmount || 0), 0);
    const pendingOwnerAdvance = advances.reduce(
      (total, advance) => total + Math.max(0, Number(advance.amount || 0) - Number(advance.clearedAmount || 0)),
      0
    );

    const totalPartyPayable = sum(parties, 'balance');

    res.json({
      todaySales,
      todayNewDues,
      totalPendingDues,
      pendingOwnerAdvance,
      orderCount: allOrders.length,
      customerCount,
      totalPartyPayable,
      partiesToPay: parties
    });
  } catch (error) {
    next(error);
  }
};
