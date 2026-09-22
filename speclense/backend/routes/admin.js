const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// --- Dashboard summary ---
router.get('/summary', async (req, res) => {
  const [[{ productCount }]] = await pool.query('SELECT COUNT(*) AS productCount FROM products');
  const [[{ orderCount }]] = await pool.query('SELECT COUNT(*) AS orderCount FROM orders');
  const [[{ userCount }]] = await pool.query("SELECT COUNT(*) AS userCount FROM users WHERE role = 'customer'");
  const [[{ revenue }]] = await pool.query("SELECT COALESCE(SUM(total),0) AS revenue FROM orders WHERE status != 'cancelled'");
  const [lowStock] = await pool.query('SELECT id, name, stock FROM products WHERE stock <= 10 ORDER BY stock ASC LIMIT 5');
  res.json({ productCount, orderCount, userCount, revenue, lowStock });
});

// --- Products CRUD ---
router.post('/products', async (req, res) => {
  const { name, category_id, description, price, compare_at_price, frame_color, lens_tint, stock, image_url, is_featured } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-5);
  try {
    const [result] = await pool.query(
      `INSERT INTO products (name, slug, category_id, description, price, compare_at_price, frame_color, lens_tint, stock, image_url, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, category_id || null, description, price, compare_at_price || null, frame_color, lens_tint, stock || 0, image_url, !!is_featured]
    );
    res.status(201).json({ id: result.insertId, slug });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not create product.' });
  }
});

router.put('/products/:id', async (req, res) => {
  const { name, category_id, description, price, compare_at_price, frame_color, lens_tint, stock, image_url, is_featured } = req.body;
  try {
    await pool.query(
      `UPDATE products SET name=?, category_id=?, description=?, price=?, compare_at_price=?,
       frame_color=?, lens_tint=?, stock=?, image_url=?, is_featured=? WHERE id=?`,
      [name, category_id || null, description, price, compare_at_price || null, frame_color, lens_tint, stock, image_url, !!is_featured, req.params.id]
    );
    res.json({ message: 'Product updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update product.' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not delete product.' });
  }
});

// --- Orders ---
router.get('/orders', async (req, res) => {
  const [orders] = await pool.query(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email
     FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`
  );
  res.json({ orders });
});

router.put('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Order status updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update order status.' });
  }
});

// --- Users ---
router.get('/users', async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
  res.json({ users: rows });
});

module.exports = router;
