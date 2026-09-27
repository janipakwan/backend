const cron = require('node-cron');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');
const { sendEmail } = require('../utils/emailSender');

let scheduledTask = null;

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

function getFormattedDate(dateObj = new Date()) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

async function buildPendingDuesData() {
  const orders = await Order.find({ dueAmount: { $gt: 0 } })
    .populate('customer', 'name phone')
    .sort({ createdAt: -1 });

  const customerTotals = new Map();
  for (const order of orders) {
    const name = order.customer?.name || 'Unknown customer';
    customerTotals.set(name, (customerTotals.get(name) || 0) + Number(order.dueAmount || 0));
  }

  const dateStr = getFormattedDate(new Date());
  let grandTotal = 0;
  const duesList = [];

  for (const [name, amount] of customerTotals.entries()) {
    grandTotal += amount;
    duesList.push({ name, amount });
  }

  // Text message format
  let textMessage = `Pending Dues Summary (${dateStr}):\n`;
  if (duesList.length === 0) {
    textMessage += 'No pending dues.';
  } else {
    for (const item of duesList) {
      textMessage += `- ${item.name}: Rs. ${item.amount.toLocaleString('en-PK')}\n`;
    }
    textMessage += `Total Pending: Rs. ${grandTotal.toLocaleString('en-PK')}`;
  }

  // HTML message format
  const rowsHtml = duesList.length === 0
    ? `<tr><td colspan="2" style="padding:12px; text-align:center; color:#6b7280;">No pending dues at this time.</td></tr>`
    : duesList.map(item => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 14px; font-weight: 500; color: #111827;">${item.name}</td>
          <td style="padding: 10px 14px; text-align: right; font-weight: 600; color: #dc2626;">Rs. ${item.amount.toLocaleString('en-PK')}</td>
        </tr>
      `).join('');

  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #dc2626; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 22px;">Jani Pakwan Center</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Daily Pending Dues Summary — ${dateStr}</p>
      </div>
      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 10px 14px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280;">Customer</th>
              <th style="padding: 10px 14px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280;">Due Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #fef2f2; font-weight: bold; border-top: 2px solid #dc2626;">
              <td style="padding: 12px 14px; color: #111827; font-size: 15px;">Grand Total Due</td>
              <td style="padding: 12px 14px; text-align: right; color: #dc2626; font-size: 16px;">Rs. ${grandTotal.toLocaleString('en-PK')}</td>
            </tr>
          </tfoot>
        </table>
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
          This is an automated administrative notification sent from Jani Pakwan Center System.
        </p>
      </div>
    </div>
  `;

  return { textMessage, htmlMessage, grandTotal, duesList, dateStr };
}

async function sendPendingDuesReminder() {
  const settings = await Settings.findOne();
  if (!settings?.adminEmail || !isValidEmail(settings.adminEmail)) {
    throw new Error('Admin Email is not configured. Please set a valid Admin Email in Settings.');
  }

  const { textMessage, htmlMessage, dateStr } = await buildPendingDuesData();

  await sendEmail({
    to: settings.adminEmail,
    subject: `Daily Pending Dues Summary (${dateStr}) - Jani Pakwan Center`,
    text: textMessage,
    html: htmlMessage
  });

  return { message: textMessage, recipient: settings.adminEmail };
}

async function scheduleEmailReminder() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  const settings = await Settings.findOne();
  if (!settings || !isValidTime(settings.reminderTime)) {
    console.log('Email reminder not scheduled: configure a valid reminder time in Settings.');
    return null;
  }

  if (!settings.adminEmail || !isValidEmail(settings.adminEmail)) {
    console.log('Email reminder not scheduled: configure a valid Admin Email in Settings.');
    return null;
  }

  const [hour, minute] = settings.reminderTime.split(':');
  const cronExpr = `${parseInt(minute, 10)} ${parseInt(hour, 10)} * * *`;

  scheduledTask = cron.schedule(cronExpr, async () => {
    try {
      console.log(`[${new Date().toISOString()}] Executing scheduled email pending dues reminder...`);
      await sendPendingDuesReminder();
      console.log('Daily email due reminder sent successfully to admin.');
    } catch (error) {
      console.error(`Email reminder scheduled run failed: ${error.message}`);
    }
  });

  console.log(`Email reminder scheduled daily at ${settings.reminderTime} to ${settings.adminEmail}.`);
  return scheduledTask;
}

module.exports = {
  isValidTime,
  isValidEmail,
  getFormattedDate,
  buildPendingDuesData,
  sendPendingDuesReminder,
  scheduleEmailReminder
};
