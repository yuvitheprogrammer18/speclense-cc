// Creates (or promotes) an admin account.
// Usage: node sql/create-admin.js admin@speclense.com "Admin User" YourPassword123
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

(async () => {
  const [, , email, name, password] = process.argv;
  if (!email || !name || !password) {
    console.log('Usage: node sql/create-admin.js <email> "<name>" <password>');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

    if (existing.length) {
      await pool.query('UPDATE users SET role = "admin", password_hash = ? WHERE email = ?', [hash, email]);
      console.log(`✔ Existing user ${email} promoted to admin.`);
    } else {
      await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "admin")', [name, email, hash]);
      console.log(`✔ Admin account created for ${email}.`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  }
})();
