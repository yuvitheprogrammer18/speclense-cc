const nodemailer = require('nodemailer');

// Works with AWS SES SMTP, Gmail (app password), or any SMTP provider -
// just fill the SMTP_* values in your .env. See SETUP_GUIDE.md.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined
});

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const mail = {
    from: process.env.SMTP_FROM || 'Speclense <no-reply@speclense.com>',
    to: toEmail,
    subject: 'Reset your Speclense password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#171B20;">Reset your password</h2>
        <p>We got a request to reset the password on your Speclense account.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#C97A3E;color:#fff;text-decoration:none;border-radius:4px;">Reset password</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      </div>`
  };

  // If SMTP isn't configured yet (local dev without credentials), just log
  // the link instead of throwing, so the forgot-password flow still works.
  if (!process.env.SMTP_USER) {
    console.log('\n[DEV MODE - no SMTP configured] Password reset link:\n', resetUrl, '\n');
    return;
  }

  await transporter.sendMail(mail);
}

module.exports = { sendPasswordResetEmail };
