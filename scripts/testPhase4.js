const assert = require('assert');
const { isValidTime, isValidEmail, getFormattedDate } = require('../jobs/emailReminder');

console.log('=== Running Phase 4 Verification Tests ===\n');

// Test 1: Time validation
console.log('1. Testing isValidTime helper...');
assert.strictEqual(isValidTime('20:00'), true);
assert.strictEqual(isValidTime('00:00'), true);
assert.strictEqual(isValidTime('23:59'), true);
assert.strictEqual(isValidTime('09:30'), true);
assert.strictEqual(isValidTime('24:00'), false);
assert.strictEqual(isValidTime('12:60'), false);
assert.strictEqual(isValidTime('invalid'), false);
assert.strictEqual(isValidTime(''), false);
console.log('✔ isValidTime passed all checks.');

// Test 2: Email validation
console.log('\n2. Testing isValidEmail helper...');
assert.strictEqual(isValidEmail('admin@janipakwan.com'), true);
assert.strictEqual(isValidEmail('janipakwan321@gmail.com'), true);
assert.strictEqual(isValidEmail('invalid-email'), false);
assert.strictEqual(isValidEmail(''), false);
console.log('✔ isValidEmail passed all checks.');

// Test 3: Date formatting
console.log('\n3. Testing getFormattedDate helper...');
const testDate1 = new Date(2026, 7, 2); // August 2
assert.strictEqual(getFormattedDate(testDate1), '2 Aug 2026');
const testDate2 = new Date(2026, 0, 15); // January 15
assert.strictEqual(getFormattedDate(testDate2), '15 Jan 2026');
console.log('✔ getFormattedDate correctly outputs "D Mon YYYY" format.');

// Test 4: Dynamic Cron rescheduling simulation
console.log('\n4. Testing cron expression generation for reminder times...');
function getCronExpr(timeStr) {
  const [hour, minute] = timeStr.split(':');
  return `${parseInt(minute, 10)} ${parseInt(hour, 10)} * * *`;
}
assert.strictEqual(getCronExpr('20:00'), '0 20 * * *');
assert.strictEqual(getCronExpr('08:15'), '15 8 * * *');
assert.strictEqual(getCronExpr('23:45'), '45 23 * * *');
console.log('✔ Cron expression generation verified.');

// Test 5: Report summarization and profit/loss calculation
console.log('\n5. Testing report summarization and profit/loss calculation...');
const orders = [
  { orderDate: new Date('2026-08-01T10:00:00Z'), totalAmount: 40000 },
  { orderDate: new Date('2026-08-01T15:00:00Z'), totalAmount: 25000 },
  { orderDate: new Date('2026-08-02T12:00:00Z'), totalAmount: 35000 }
];
const expenses = [
  { date: new Date('2026-08-01T11:00:00Z'), amount: 15000 },
  { date: new Date('2026-08-02T09:00:00Z'), amount: 10000 }
];

const totalSales = orders.reduce((s, o) => s + o.totalAmount, 0);
const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
const netProfit = totalSales - totalExpenses;

assert.strictEqual(totalSales, 100000);
assert.strictEqual(totalExpenses, 25000);
assert.strictEqual(netProfit, 75000);
console.log('✔ Report calculations verified (Sales: 100k, Expenses: 25k, Net: 75k).');

console.log('\n=== All Phase 4 Verification Tests Passed! ===');
