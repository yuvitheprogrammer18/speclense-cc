const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// 1. Place an order from the cart
router.post('/', requireAuth, async (req, res) => {
  // Extract paymentMethod from the request, default to 'COD' if not provided
  const { items, shipping, paymentMethod = 'COD' } = req.body;
  
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: 'Your cart is empty.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let total = 0;
    const lineItems = [];
    
    // Check stock and calculate total
    for (const item of items) {
      const [rows] = await conn.query('SELECT * FROM products WHERE id = ?', [item.productId]);
      if (!rows.length) throw new Error('One of the items in your cart is no longer available.');
      const product = rows[0];
      if (product.stock < item.quantity) throw new Error(`${product.name} doesn't have enough stock left.`);

      total += Number(product.price) * item.quantity;
      lineItems.push({ product, quantity: item.quantity });
    }

    // Set order status based on payment method. 
    // COD orders are immediately 'processing' instead of 'pending'.
    const orderStatus = paymentMethod === 'COD' ? 'processing' : 'pending';

    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, status, total, shipping_name, shipping_address, shipping_city, shipping_zip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, orderStatus, total.toFixed(2), shipping?.name, shipping?.address, shipping?.city, shipping?.zip]
    );

    // Insert order items and reserve stock
    for (const li of lineItems) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [orderResult.insertId, li.product.id, li.product.name, li.product.price, li.quantity]
      );
      await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [li.quantity, li.product.id]);
    }

    await conn.commit();
    
    // Return order details to frontend
    res.status(201).json({ 
      orderId: orderResult.insertId, 
      total: total.toFixed(2),
      status: orderStatus,
      paymentMethod: paymentMethod,
      message: 'Order placed successfully!'
    });
    
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ message: err.message || 'Could not place your order.' });
  } finally {
    conn.release();
  }
});

// 2. Order history for the logged-in user
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', 
      [req.user.id]
    );
    
    for (const order of orders) {
      const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }
    
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not fetch order history.' });
  }
});

module.exports = router;
