const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. Place an order from the cart & Generate Razorpay Order
router.post('/', requireAuth, async (req, res) => {
  const { items, shipping } = req.body;
  
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

    // Insert order into your MariaDB with 'pending' status
    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, status, total, shipping_name, shipping_address, shipping_city, shipping_zip)
       VALUES (?, 'pending', ?, ?, ?, ?, ?)`,
      [req.user.id, total.toFixed(2), shipping?.name, shipping?.address, shipping?.city, shipping?.zip]
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

    // --- RAZORPAY INTEGRATION ---
    // Amount must be in the smallest currency unit (paise for INR, so multiply by 100)
    const options = {
      amount: Math.round(total * 100), 
      currency: 'INR',
      receipt: `receipt_order_${orderResult.insertId}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    await conn.commit();
    
    // Return BOTH your DB orderId and the Razorpay Order details to the frontend
    res.status(201).json({ 
      orderId: orderResult.insertId, 
      total: total.toFixed(2),
      status: 'pending',
      razorpayOrderId: razorpayOrder.id,
      amount: options.amount,
      currency: options.currency
    });
    
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ message: err.message || 'Could not place your order.' });
  } finally {
    conn.release();
  }
});

// 2. Verify Razorpay Payment Signature
router.post('/verify', requireAuth, async (req, res) => {
  const { 
    orderId, // Your MariaDB order ID
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature 
  } = req.body; 

  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Missing payment verification details.' });
  }

  try {
    // --- RAZORPAY SIGNATURE VERIFICATION ---
    // Concatenate the order_id and payment_id with a pipe
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    // Generate the expected signature using your secret key
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    // Compare signatures
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature. Verification failed.' });
    }

    // If signature matches, update order status to paid in your database
    const [result] = await pool.query(
      'UPDATE orders SET status = "paid" WHERE id = ? AND user_id = ?',
      [orderId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found or unauthorized.' });
    }

    res.json({ message: 'Payment verified successfully.', orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Payment verification error.' });
  }
});

// 3. Order history
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
