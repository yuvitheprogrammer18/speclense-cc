# Speclense — Eyewear E-Commerce Website

A full-stack e-commerce site for an eyewear brand called **Speclense**.

```
speclense/
├── backend/     Node.js + Express API (MySQL / AWS RDS, JWT auth, AWS S3-ready)
└── frontend/    Static HTML/CSS/JS storefront + admin panel (no build step)
```

**Features**
- Storefront: home, shop with filters/search/sort, product detail, cart, checkout
- Auth: sign up, log in, **forgot password / reset password via email**
- Admin panel: dashboard stats, product CRUD, order status management, customer list
- Hover effects, responsive layout, custom design system (no template UI kit)
- Backend designed to run against **AWS RDS (MySQL)** and **AWS S3** (product images) / **AWS SES** (reset emails)

👉 For full setup and run instructions (local + AWS), see **SETUP_GUIDE.md** (shared alongside this zip).

**Quick local start**
```bash
cd backend && cp .env.example .env   # fill in DB + JWT values
npm install
# create the database + tables using sql/schema.sql, then:
npm run seed
node sql/create-admin.js you@speclense.com "Your Name" YourPassword123
npm run dev
```
Then open `frontend/index.html` in your browser (or serve the folder — see SETUP_GUIDE.md).
Admin panel: `frontend/admin/login.html`.
