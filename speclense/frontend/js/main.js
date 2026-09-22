function productCard(p) {
  const onSale = p.compare_at_price && Number(p.compare_at_price) > Number(p.price);
  return `
    <article class="product-card">
      <a href="product.html?slug=${p.slug}">
        <div class="frame">
          ${onSale ? '<span class="badge sale">Sale</span>' : ''}
          <img src="${p.image_url}" alt="${p.name}" loading="lazy">
          <span class="corner tl"></span><span class="corner br"></span>
        </div>
      </a>
      <div class="product-body">
        <div class="cat-label">${p.category_name || ''}</div>
        <h3><a href="product.html?slug=${p.slug}">${p.name}</a></h3>
        <div class="meta">${p.frame_color || ''} · ${p.lens_tint || ''}</div>
        <div class="price-row">
          <span class="price">${money(p.price)}</span>
          ${onSale ? `<span class="price-compare">${money(p.compare_at_price)}</span>` : ''}
        </div>
        <button class="btn btn-outline" data-add="${p.id}">Add to cart</button>
      </div>
    </article>`;
}

function wireAddToCartButtons(container, products) {
  container.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = products.find(p => p.id === Number(btn.dataset.add));
      Cart.add(product, 1);
      paintCartCount();
      btn.textContent = 'Added ✓';
      setTimeout(() => (btn.textContent = 'Add to cart'), 1200);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // ---- Homepage featured products ----
  const featuredGrid = document.getElementById('featured-grid');
  if (featuredGrid) {
    try {
      const { products } = await Api.getProducts('?featured=true');
      featuredGrid.innerHTML = products.map(productCard).join('');
      wireAddToCartButtons(featuredGrid, products);
    } catch (err) {
      featuredGrid.innerHTML = `<p>Could not load products. Is the backend running? (${err.message})</p>`;
    }
  }

  // ---- Shop page ----
  const shopGrid = document.getElementById('shop-grid');
  if (shopGrid) await renderShopPage(shopGrid);

  // ---- Product detail page ----
  const pdRoot = document.getElementById('product-detail');
  if (pdRoot) await renderProductDetail(pdRoot);

  // ---- Account page ----
  const accountRoot = document.getElementById('account-root');
  if (accountRoot) await renderAccountPage(accountRoot);
});

async function renderShopPage(grid) {
  const params = new URLSearchParams(location.search);
  const state = { category: params.get('category') || '', sort: '', search: '' };

  const chipRow = document.getElementById('category-chips');
  const sortSelect = document.getElementById('sort-select');
  const searchInput = document.getElementById('search-input');

  try {
    const { categories } = await Api.getCategories();
    chipRow.innerHTML = `<button class="chip ${!state.category ? 'active' : ''}" data-slug="">All</button>` +
      categories.map(c => `<button class="chip ${state.category === c.slug ? 'active' : ''}" data-slug="${c.slug}">${c.name}</button>`).join('');

    chipRow.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.category = chip.dataset.slug;
        chipRow.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
        load();
      });
    });
  } catch (err) { /* categories are optional decoration */ }

  sortSelect?.addEventListener('change', () => { state.sort = sortSelect.value; load(); });
  searchInput?.addEventListener('input', () => { state.search = searchInput.value; load(); });

  async function load() {
    const qs = new URLSearchParams();
    if (state.category) qs.set('category', state.category);
    if (state.sort) qs.set('sort', state.sort);
    if (state.search) qs.set('search', state.search);
    grid.innerHTML = '<p>Loading…</p>';
    try {
      const { products } = await Api.getProducts(`?${qs.toString()}`);
      grid.innerHTML = products.length ? products.map(productCard).join('') : '<p>No frames match those filters.</p>';
      wireAddToCartButtons(grid, products);
    } catch (err) {
      grid.innerHTML = `<p>Could not load products. Is the backend running? (${err.message})</p>`;
    }
  }
  load();
}

async function renderProductDetail(root) {
  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug) { root.innerHTML = '<p>Product not found.</p>'; return; }

  try {
    const { product } = await Api.getProduct(slug);
    const onSale = product.compare_at_price && Number(product.compare_at_price) > Number(product.price);
    root.innerHTML = `
      <div class="pd-image"><img src="${product.image_url}" alt="${product.name}"></div>
      <div class="pd-info">
        <div class="cat-label">${product.category_name || ''}</div>
        <h1>${product.name}</h1>
        <div class="pd-price">${money(product.price)} ${onSale ? `<span class="price-compare">${money(product.compare_at_price)}</span>` : ''}</div>
        <p>${product.description || ''}</p>
        <div class="pd-specs">
          <div><span>Frame</span>${product.frame_color || '—'}</div>
          <div><span>Lens</span>${product.lens_tint || '—'}</div>
          <div><span>In stock</span>${product.stock}</div>
          <div><span>Rating</span>${product.rating || '4.5'} / 5</div>
        </div>
        <div class="pd-actions">
          <div class="qty-stepper">
            <button type="button" id="qty-minus">−</button>
            <input type="number" id="qty-value" value="1" min="1">
            <button type="button" id="qty-plus">+</button>
          </div>
          <button class="btn btn-primary" id="pd-add">Add to cart</button>
        </div>
      </div>`;

    document.getElementById('qty-minus').addEventListener('click', () => {
      const el = document.getElementById('qty-value'); el.value = Math.max(1, Number(el.value) - 1);
    });
    document.getElementById('qty-plus').addEventListener('click', () => {
      const el = document.getElementById('qty-value'); el.value = Number(el.value) + 1;
    });
    document.getElementById('pd-add').addEventListener('click', () => {
      const qty = Number(document.getElementById('qty-value').value) || 1;
      Cart.add(product, qty);
      paintCartCount();
      const btn = document.getElementById('pd-add');
      btn.textContent = 'Added ✓';
      setTimeout(() => (btn.textContent = 'Add to cart'), 1200);
    });
  } catch (err) {
    root.innerHTML = `<p>Could not load this product. (${err.message})</p>`;
  }
}

async function renderAccountPage(root) {
  if (!Session.isLoggedIn()) {
    window.location.href = 'login.html?redirect=account.html';
    return;
  }
  const user = Session.user;
  document.getElementById('account-name').textContent = user.name;
  document.getElementById('account-email').textContent = user.email;

  const ordersEl = document.getElementById('order-history');
  try {
    const { orders } = await Api.myOrders();
    ordersEl.innerHTML = orders.length ? orders.map(o => `
      <div class="cart-line" style="grid-template-columns:1fr auto auto;">
        <div>
          <strong>Order #${o.id}</strong><br>
          <span style="color:var(--steel);font-size:0.85rem;">${new Date(o.created_at).toLocaleDateString()} · ${o.items.length} item(s)</span>
        </div>
        <span class="status-tag status-${o.status}">${o.status}</span>
        <strong>${money(o.total)}</strong>
      </div>`).join('') : '<p>No orders yet — your first pair is one click away.</p>';
  } catch (err) {
    ordersEl.innerHTML = `<p>Could not load order history. (${err.message})</p>`;
  }
}
