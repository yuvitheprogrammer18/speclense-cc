const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// GET /api/products?category=sunglasses&search=aviator&sort=price_asc
router.get('/', async (req, res) => {
  const { category, search, sort, featured } = req.query;
  let sql = `SELECT p.*, c.name AS category_name, c.slug AS category_slug
             FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1`;
  const params = [];

  if (category) { sql += ' AND c.slug = ?'; params.push(category); }
  if (search) { sql += ' AND p.name LIKE ?'; params.push(`%${search}%`); }
  if (featured === 'true') { sql += ' AND p.is_featured = TRUE'; }

  if (sort === 'price_asc') sql += ' ORDER BY p.price ASC';
  else if (sort === 'price_desc') sql += ' ORDER BY p.price DESC';
  else sql += ' ORDER BY p.created_at DESC';

  try {
    const [rows] = await pool.query(sql, params);
    res.json({ products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load products.' });
  }
});

router.get('/categories', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
  res.json({ categories: rows });
});

router.get('/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ?`,
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ message: 'Product not found.' });
    res.json({ product: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load product.' });
  }
});

module.exports = router;
