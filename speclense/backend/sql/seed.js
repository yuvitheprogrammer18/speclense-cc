// Populates the database with starter categories + products so the store
// isn't empty on first run. Run with: npm run seed  (after schema.sql has been applied)
require('dotenv').config();
const pool = require('../config/db');

const categories = [
  { name: 'Sunglasses', slug: 'sunglasses' },
  { name: 'Optical Frames', slug: 'optical-frames' },
  { name: 'Blue-Light Glasses', slug: 'blue-light' },
  { name: 'Reading Glasses', slug: 'reading' }
];

// image_url uses a placeholder image service so the storefront renders
// real-looking product art out of the box. Swap these for your own product
// photos (hosted on S3) whenever you're ready - see SETUP_GUIDE.md.
const products = [
  { name: 'Aurora Aviator', category: 'sunglasses', price: 89.0, compare: 110, frame: 'Gunmetal', tint: 'Amber Gradient', stock: 34, featured: true,
    img: 'https://placehold.co/700x500/2b2f36/c97a3e?text=Aurora+Aviator', desc: 'A classic teardrop aviator with a warm amber gradient lens and a brushed gunmetal frame.' },
  { name: 'Solstice Round', category: 'sunglasses', price: 74.0, compare: null, frame: 'Tortoise', tint: 'Smoke Grey', stock: 21, featured: true,
    img: 'https://placehold.co/700x500/3b3226/c97a3e?text=Solstice+Round', desc: 'Retro round lenses in a tortoiseshell acetate frame, finished with a smoke grey tint.' },
  { name: 'Meridian Square', category: 'sunglasses', price: 96.0, compare: 120, frame: 'Matte Black', tint: 'Polarized Green', stock: 18, featured: false,
    img: 'https://placehold.co/700x500/16181c/4a6fa1?text=Meridian+Square', desc: 'Bold square sunglasses with polarized green lenses that cut glare on bright days.' },
  { name: 'Cascade Wrap', category: 'sunglasses', price: 82.0, compare: null, frame: 'Navy', tint: 'Blue Mirror', stock: 27, featured: false,
    img: 'https://placehold.co/700x500/1c2733/4a6fa1?text=Cascade+Wrap', desc: 'Sport wrap sunglasses with a blue mirror finish, built for movement.' },

  { name: 'Ledger Rectangle', category: 'optical-frames', price: 64.0, compare: null, frame: 'Walnut Acetate', tint: 'Clear', stock: 40, featured: true,
    img: 'https://placehold.co/700x500/3a2c1f/f4f0e6?text=Ledger+Rectangle', desc: 'A dependable rectangular optical frame in warm walnut acetate, ready for your prescription.' },
  { name: 'Folio Oval', category: 'optical-frames', price: 68.0, compare: 85, frame: 'Champagne Metal', tint: 'Clear', stock: 15, featured: false,
    img: 'https://placehold.co/700x500/4a4137/f4f0e6?text=Folio+Oval', desc: 'A slim oval metal frame with a champagne finish, light enough to forget you\'re wearing it.' },
  { name: 'Archive Browline', category: 'optical-frames', price: 72.0, compare: null, frame: 'Black & Gold', tint: 'Clear', stock: 22, featured: false,
    img: 'https://placehold.co/700x500/1a1a1a/c97a3e?text=Archive+Browline', desc: 'A browline silhouette pairing a bold acetate top with a fine gold-tone metal bottom.' },

  { name: 'Nightshift Rect', category: 'blue-light', price: 45.0, compare: 60, frame: 'Charcoal', tint: 'Blue-Light Filter', stock: 55, featured: true,
    img: 'https://placehold.co/700x500/22262b/4a6fa1?text=Nightshift+Rect', desc: 'Everyday blue-light filtering lenses in a light charcoal frame, made for long screen sessions.' },
  { name: 'Focus Round', category: 'blue-light', price: 42.0, compare: null, frame: 'Clear Crystal', tint: 'Blue-Light Filter', stock: 48, featured: false,
    img: 'https://placehold.co/700x500/e9e4d8/4a6fa1?text=Focus+Round', desc: 'Translucent round frames with a blue-light coating that softens screen glare.' },
  { name: 'Drift Square', category: 'blue-light', price: 48.0, compare: 58, frame: 'Rose Taupe', tint: 'Blue-Light Filter', stock: 30, featured: false,
    img: 'https://placehold.co/700x500/6b524c/4a6fa1?text=Drift+Square', desc: 'A soft square shape in rose taupe acetate with anti-fatigue blue-light lenses.' },

  { name: 'Study Half-Frame +1.5', category: 'reading', price: 28.0, compare: null, frame: 'Tortoise', tint: 'Clear +1.5', stock: 60, featured: false,
    img: 'https://placehold.co/700x500/3b3226/f4f0e6?text=Study+%2B1.5', desc: 'A half-frame reader in tortoiseshell, +1.5 magnification for close work.' },
  { name: 'Study Full-Frame +2.0', category: 'reading', price: 32.0, compare: 40, frame: 'Navy', tint: 'Clear +2.0', stock: 44, featured: false,
    img: 'https://placehold.co/700x500/1c2733/f4f0e6?text=Study+%2B2.0', desc: 'A full-frame reader in matte navy, +2.0 magnification for everyday reading.' }
];

(async () => {
  try {
    const catIds = {};
    for (const c of categories) {
      await pool.query('INSERT IGNORE INTO categories (name, slug) VALUES (?, ?)', [c.name, c.slug]);
      const [rows] = await pool.query('SELECT id FROM categories WHERE slug = ?', [c.slug]);
      catIds[c.slug] = rows[0].id;
    }

    for (const p of products) {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await pool.query(
        `INSERT IGNORE INTO products
         (name, slug, category_id, description, price, compare_at_price, frame_color, lens_tint, stock, image_url, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.name, slug, catIds[p.category], p.desc, p.price, p.compare, p.frame, p.tint, p.stock, p.img, p.featured]
      );
    }

    console.log('✔ Seed complete: categories + products inserted.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
