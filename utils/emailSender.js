const nodemailer = require('nodemailer');

const emailUser = process.env.EMAIL_USER;
const emailAppPassword = process.env.EMAIL_APP_PASSWORD;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailAppPassword
  }
});

async function verifyEmailTransporter() {
  const isConfigured = Boolean(emailUser && emailAppPassword);
  
  if (!isConfigured) {
    console.warn('[Email Transporter] Warning: EMAIL_USER or EMAIL_APP_PASSWORD is missing in .env');
    return false;
  }

  // Startup log confirming email transporter is configured (without printing actual password)
  console.log(`[Email Transporter] Configured with user: ${emailUser} (password: [PROTECTED / ${emailAppPassword ? 'SET' : 'NOT SET'}])`);

  try {
    await transporter.verify();
    console.log('[Email Transporter] Transporter verification SUCCESS: Connection established and ready to send emails.');
    return true;
  } catch (error) {
    console.error(`[Email Transporter] Transporter verification FAILED: ${error.message}`);
    return false;
  }
}

async function sendEmail({ to, subject, text, html, attachments }) {
  if (!emailUser || !emailAppPassword) {
    throw new Error('Email credentials are not configured in environment variables.');
  }

  const mailOptions = {
    from: `"Jani Pakwan Center" <${emailUser}>`,
    to,
    subject,
    text,
    html,
    attachments
  };

  return await transporter.sendMail(mailOptions);
}

module.exports = {
  transporter,
  verifyEmailTransporter,
  sendEmail
};
