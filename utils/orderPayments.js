const Payment = require('../models/Payment');
const Order = require('../models/Order');

async function recalculateOrderPaymentState(orderId, session) {
  const order = await Order.findById(orderId).session(session || null);
  if (!order) throw new Error('Order not found while recalculating payments.');

  const [totals] = await Payment.aggregate([
    { $match: { order: order._id } },
    { $group: { _id: null, paid: { $sum: '$amountPaid' } } }
  ]).session(session || null);

  const paidAmount = totals?.paid || 0;
  order.dueAmount = Math.max(0, order.totalAmount - paidAmount);
  if (order.dueAmount === 0) order.status = 'paid';
  else if (paidAmount > 0) order.status = 'partially_paid';
  else order.status = 'pending';
  await order.save({ session });
  return order;
}

module.exports = { recalculateOrderPaymentState };
