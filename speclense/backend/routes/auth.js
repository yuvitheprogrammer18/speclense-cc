const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/mailer');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// --- Register ---
router.post('/register',
  body('name').trim().notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Please check your details and try again.' });

    const { name, email, password } = req.body;
    try {
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length) return res.status(409).json({ message: 'An account with that email already exists.' });

      const hash = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name, email, hash, 'customer']
      );

      const user = { id: result.insertId, email, role: 'customer', name };
      res.status(201).json({ token: signToken(user), user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Something went wrong creating your account.' });
    }
  });

// --- Login (used by both storefront and admin panel) ---
router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (!rows.length) return res.status(401).json({ message: 'Incorrect email or password.' });

      const user = rows[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ message: 'Incorrect email or password.' });

      res.json({
        token: signToken(user),
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Something went wrong logging you in.' });
    }
  });

// --- Forgot password: request a reset link ---
router.post('/forgot-password', body('email').isEmail(), async (req, res) => {
  const { email } = req.body;
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

    // Always respond the same way, whether or not the email exists,
    // so the form can't be used to discover registered accounts.
    if (rows.length) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await pool.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, rows[0].id]);

      const resetUrl = `${process.env.CLIENT_URL}/reset-password.html?token=${token}`;
      await sendPasswordResetEmail(email, resetUrl);
    }

    res.json({ message: 'If that email has an account, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// --- Reset password: consume the token ---
router.post('/reset-password',
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const { token, password } = req.body;
    try {
      const [rows] = await pool.query(
        'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
        [token]
      );
      if (!rows.length) return res.status(400).json({ message: 'This reset link is invalid or has expired.' });

      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
        [hash, rows[0].id]
      );

      res.json({ message: 'Your password has been reset. You can now log in.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
  });

// --- Current user (used to keep the frontend session in sync) ---
router.get('/me', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) return res.status(404).json({ message: 'User not found.' });
  res.json({ user: rows[0] });
});

module.exports = router;
