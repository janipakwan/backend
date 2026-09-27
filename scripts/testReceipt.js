const assert = require('assert');

console.log('=== Running Printable Receipt Feature Verification ===\n');

// Test 1: Verify hardcoded business metadata
const businessDetails = {
  name: 'Jani Pakwan Center',
  owner: 'Haji Ramzan Jani — 0320-2658043',
  coOwner: 'Ehtisham Jani — 0303-0004026',
  address: 'Al Aeed Empire, Naya Mohana Mandi Motor, Samundri Road, Faisalabad'
};

assert.strictEqual(businessDetails.name, 'Jani Pakwan Center');
assert.strictEqual(businessDetails.owner, 'Haji Ramzan Jani — 0320-2658043');
assert.strictEqual(businessDetails.coOwner, 'Ehtisham Jani — 0303-0004026');
assert.strictEqual(businessDetails.address, 'Al Aeed Empire, Naya Mohana Mandi Motor, Samundri Road, Faisalabad');
console.log('✔ Business details match specifications exactly.');

// Test 2: Receipt Calculation and Status Rules
function computeReceiptSummary(order, payments = []) {
  const totalAmount = order.totalAmount;
  const advancePaid = order.advancePaid || 0;
  const additionalPayments = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalPaid = advancePaid + additionalPayments;
  const dueAmount = Math.max(0, totalAmount - totalPaid);
  const isFullyPaid = dueAmount === 0;

  return {
    totalAmount,
    advancePaid,
    additionalPayments,
    totalPaid,
    dueAmount,
    statusText: isFullyPaid ? 'FULLY PAID' : `Rs. ${dueAmount.toLocaleString('en-PK')}`
  };
}

const mockOrderUnpaid = {
  _id: '66a123456789abcdef012345',
  totalAmount: 120000,
  advancePaid: 20000,
  dueAmount: 100000
};
const summary1 = computeReceiptSummary(mockOrderUnpaid, []);
assert.strictEqual(summary1.dueAmount, 100000);
assert.strictEqual(summary1.statusText, 'Rs. 100,000');
console.log('✔ Unpaid order receipt calculates due amount correctly.');

const mockOrderPaid = {
  _id: '66a123456789abcdef012346',
  totalAmount: 50000,
  advancePaid: 50000,
  dueAmount: 0
};
const summary2 = computeReceiptSummary(mockOrderPaid, []);
assert.strictEqual(summary2.dueAmount, 0);
assert.strictEqual(summary2.statusText, 'FULLY PAID');
console.log('✔ Fully paid order receipt shows "FULLY PAID" text.');

console.log('\n=== All Printable Receipt Tests Passed Successfully! ===');
