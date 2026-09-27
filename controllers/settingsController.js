const Settings = require('../models/Settings');
const { isValidTime, isValidEmail, sendPendingDuesReminder, scheduleEmailReminder } = require('../jobs/emailReminder');

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOne() || await Settings.create({});
    res.json({ settings });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const reminderTime = req.body.reminderTime?.trim();
    const adminEmail = req.body.adminEmail?.trim() || '';

    if (!isValidTime(reminderTime)) {
      return res.status(400).json({ message: 'Reminder time must use 24-hour HH:MM format.' });
    }

    if (adminEmail && !isValidEmail(adminEmail)) {
      return res.status(400).json({ message: 'Please provide a valid admin email address.' });
    }

    const settings = await Settings.findOneAndUpdate(
      {},
      {
        adminEmail,
        reminderTime,
        $unset: { adminWhatsappNumber: 1, callMeBotApiKey: 1 }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await scheduleEmailReminder();
    res.json({ settings });
  } catch (error) {
    next(error);
  }
};

exports.sendTestReminder = async (req, res) => {
  try {
    const result = await sendPendingDuesReminder();
    res.json({
      message: `Test reminder email sent successfully to ${result.recipient}.`,
      preview: result.message
    });
  } catch (error) {
    console.error(`Email test reminder failed: ${error.message}`);
    res.status(400).json({ message: error.message });
  }
};
