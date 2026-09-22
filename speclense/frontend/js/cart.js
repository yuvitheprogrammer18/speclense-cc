const Cart = {
  key: 'speclense_cart',
  get items() {
    try { return JSON.parse(localStorage.getItem(this.key) || '[]'); }
    catch { return []; }
  },
  save(items) { localStorage.setItem(this.key, JSON.stringify(items)); },
  add(product, qty = 1) {
    const items = this.items;
    const existing = items.find(i => i.id === product.id);
    if (existing) existing.qty += qty;
    else items.push({ id: product.id, name: product.name, price: Number(product.price), image_url: product.image_url, qty });
    this.save(items);
  },
  updateQty(id, qty) {
    let items = this.items;
    if (qty <= 0) items = items.filter(i => i.id !== id);
    else items = items.map(i => (i.id === id ? { ...i, qty } : i));
    this.save(items);
  },
  remove(id) { this.save(this.items.filter(i => i.id !== id)); },
  clear() { this.save([]); },
  count() { return this.items.reduce((n, i) => n + i.qty, 0); },
  total() { return this.items.reduce((n, i) => n + i.qty * i.price, 0); }
};

function paintCartCount() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = Cart.count();
}

function money(n) { return `$${Number(n).toFixed(2)}`; }

document.addEventListener('DOMContentLoaded', () => {
  paintCartCount();

  // ---- Cart page ----
  const cartList = document.getElementById('cart-list');
  if (cartList) renderCartPage();

  // ---- Checkout page ----
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) renderCheckoutPage(checkoutForm);
});

function renderCartPage() {
  const listEl = document.getElementById('cart-list');
  const emptyEl = document.getElementById('cart-empty');
  const summaryEl = document.getElementById('cart-summary');

  function draw() {
    const items = Cart.items;
    if (!items.length) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
      summaryEl.style.display = 'none';
      return;
    }
    emptyEl.style.display = 'none';
    summaryEl.style.display = 'block';

    listEl.innerHTML = items.map(i => `
      <div class="cart-line" data-id="${i.id}">
        <img src="${i.image_url}" alt="${i.name}">
        <div>
          <h3 style="font-size:1rem;margin:0 0 4px;">${i.name}</h3>
          <span style="color:var(--steel);font-size:0.85rem;">${money(i.price)} each</span>
        </div>
        <input type="number" min="0" class="qty-input" value="${i.qty}">
        <div style="display:flex;align-items:center;gap:16px;">
          <strong>${money(i.price * i.qty)}</strong>
          <button class="table-actions" style="border:none;background:none;color:var(--amber-deep);cursor:pointer;" data-remove>Remove</button>
        </div>
      </div>`).join('');

    document.getElementById('summary-subtotal').textContent = money(Cart.total());
    document.getElementById('summary-total').textContent = money(Cart.total());

    listEl.querySelectorAll('.qty-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = Number(e.target.closest('.cart-line').dataset.id);
        Cart.updateQty(id, Number(e.target.value));
        paintCartCount();
        draw();
      });
    });
    listEl.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.target.closest('.cart-line').dataset.id);
        Cart.remove(id);
        paintCartCount();
        draw();
      });
    });
  }

  draw();
}

function renderCheckoutPage(form) {
  const summaryEl = document.getElementById('checkout-summary');
  const items = Cart.items;

  if (!items.length) {
    document.getElementById('checkout-layout').innerHTML =
      '<div class="empty-state"><h2>Your cart is empty</h2><p>Add a few frames before checking out.</p><a href="shop.html" class="btn btn-primary">Browse the shop</a></div>';
    return;
  }

  summaryEl.innerHTML = items.map(i => `
    <div class="summary-row"><span>${i.name} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>
  `).join('') + `<div class="summary-row total"><span>Total</span><span>${money(Cart.total())}</span></div>`;

  if (!Session.isLoggedIn()) {
    document.getElementById('checkout-auth-notice').style.display = 'block';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('form-msg');

    if (!Session.isLoggedIn()) {
      window.location.href = 'login.html?redirect=checkout.html';
      return;
    }

    const shipping = {
      name: document.getElementById('ship-name').value.trim(),
      address: document.getElementById('ship-address').value.trim(),
      city: document.getElementById('ship-city').value.trim(),
      zip: document.getElementById('ship-zip').value.trim()
    };
    const payload = {
      items: items.map(i => ({ productId: i.id, quantity: i.qty })),
      shipping
    };

    try {
      const result = await Api.placeOrder(payload);
      Cart.clear();
      document.getElementById('checkout-layout').innerHTML = `
        <div class="empty-state">
          <h2>Order placed 🎉</h2>
          <p>Order #${result.orderId} — total ${money(result.total)}. A confirmation has been recorded on your account.</p>
          <a href="account.html" class="btn btn-primary">View my orders</a>
        </div>`;
    } catch (err) {
      showMsg(msg, err.message);
    }
  });
}
