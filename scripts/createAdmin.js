require('dotenv').config();
const connectDatabase = require('../config/db');
const User = require('../models/User');

async function createAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be set in backend/.env.');
  }
  if (ADMIN_PASSWORD.length < 8) throw new Error('ADMIN_PASSWORD must contain at least 8 characters.');

  await connectDatabase();
  const email = ADMIN_EMAIL.trim().toLowerCase();
  let admin = await User.findOne({ email }).select('+password');

  if (admin) {
    admin.name = ADMIN_NAME.trim();
    admin.password = ADMIN_PASSWORD;
    admin.role = 'admin';
    admin.isActive = true;
    await admin.save();
    console.log(`Admin account updated: ${email}`);
  } else {
    admin = await User.create({ name: ADMIN_NAME.trim(), email, password: ADMIN_PASSWORD, role: 'admin' });
    console.log(`Admin account created: ${admin.email}`);
  }
}

createAdmin()
  .catch((error) => {
    console.error(`Unable to create admin: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
  });
