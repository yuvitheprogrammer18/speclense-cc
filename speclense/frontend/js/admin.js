function guardAdmin() {
  if (!Session.isLoggedIn() || !Session.isAdmin()) {
    window.location.href = 'login.html';
    return false;
  }
  const nameEl = document.getElementById('admin-name');
  if (nameEl) nameEl.textContent = Session.user.name;
  const logoutBtn = document.getElementById('admin-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', () => { Session.clear(); window.location.href = 'login.html'; });
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.body.classList.contains('admin-page')) return;
  if (!guardAdmin()) return;

  if (document.getElementById('dash-stats')) await renderDashboard();
  if (document.getElementById('admin-product-table')) await renderProductAdmin();
  if (document.getElementById('admin-order-table')) await renderOrderAdmin();
  if (document.getElementById('admin-user-table')) await renderUserAdmin();
});

async function renderDashboard() {
  try {
    const s = await Api.adminSummary();
    document.getElementById('dash-stats').innerHTML = `
      <div class="stat-card"><div class="num">${s.productCount}</div><div class="label">Products</div></div>
      <div class="stat-card"><div class="num">${s.orderCount}</div><div class="label">Orders</div></div>
      <div class="stat-card"><div class="num">${s.userCount}</div><div class="label">Customers</div></div>
      <div class="stat-card"><div class="num">$${Number(s.revenue).toFixed(0)}</div><div class="label">Revenue</div></div>`;

    const lowStockEl = document.getElementById('dash-lowstock');
    lowStockEl.innerHTML = s.lowStock.length
      ? s.lowStock.map(p => `<tr><td>${p.name}</td><td>${p.stock} left</td></tr>`).join('')
      : '<tr><td colspan="2">Everything is well stocked.</td></tr>';
  } catch (err) {
    document.getElementById('dash-stats').innerHTML = `<p>Could not load dashboard. (${err.message})</p>`;
  }
}

// ---------------- Products ----------------
async function renderProductAdmin() {
  const tbody = document.querySelector('#admin-product-table tbody');
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  let categories = [];

  try { categories = (await Api.getCategories()).categories; } catch (e) { /* ok */ }
  document.getElementById('p-category').innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  async function load() {
    tbody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';
    const { products } = await Api.getProducts('');
    tbody.innerHTML = products.map(p => `
      <tr>
        <td><img src="${p.image_url}" alt="" style="width:52px;height:38px;object-fit:cover;"></td>
        <td>${p.name}</td>
        <td>${p.category_name || '—'}</td>
        <td>${money(p.price)}</td>
        <td>${p.stock}</td>
        <td class="table-actions">
          <button data-edit='${JSON.stringify(p).replace(/'/g, "&#39;")}'>Edit</button>
          <button data-del="${p.id}">Delete</button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openModal(JSON.parse(btn.dataset.edit.replace(/&#39;/g, "'"))));
    });
    tbody.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this product?')) return;
        await Api.adminDeleteProduct(btn.dataset.del);
        load();
      });
    });
  }

  function openModal(product = null) {
    form.reset();
    document.getElementById('modal-title').textContent = product ? 'Edit product' : 'Add product';
    document.getElementById('p-id').value = product?.id || '';
    document.getElementById('p-name').value = product?.name || '';
    document.getElementById('p-category').value = product?.category_id || '';
    document.getElementById('p-description').value = product?.description || '';
    document.getElementById('p-price').value = product?.price || '';
    document.getElementById('p-compare').value = product?.compare_at_price || '';
    document.getElementById('p-frame').value = product?.frame_color || '';
    document.getElementById('p-tint').value = product?.lens_tint || '';
    document.getElementById('p-stock').value = product?.stock ?? 0;
    document.getElementById('p-image').value = product?.image_url || '';
    document.getElementById('p-featured').checked = !!product?.is_featured;
    modal.classList.add('show');
  }
  function closeModal() { modal.classList.remove('show'); }

  document.getElementById('add-product-btn').addEventListener('click', () => openModal());
  document.getElementById('modal-cancel').addEventListener('click', closeModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('p-name').value.trim(),
      category_id: Number(document.getElementById('p-category').value) || null,
      description: document.getElementById('p-description').value.trim(),
      price: Number(document.getElementById('p-price').value),
      compare_at_price: Number(document.getElementById('p-compare').value) || null,
      frame_color: document.getElementById('p-frame').value.trim(),
      lens_tint: document.getElementById('p-tint').value.trim(),
      stock: Number(document.getElementById('p-stock').value),
      image_url: document.getElementById('p-image').value.trim(),
      is_featured: document.getElementById('p-featured').checked
    };
    const id = document.getElementById('p-id').value;
    try {
      if (id) await Api.adminUpdateProduct(id, payload);
      else await Api.adminCreateProduct(payload);
      closeModal();
      load();
    } catch (err) {
      alert(err.message);
    }
  });

  load();
}

// ---------------- Orders ----------------
async function renderOrderAdmin() {
  const tbody = document.querySelector('#admin-order-table tbody');
  async function load() {
    const { orders } = await Api.adminOrders();
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>#${o.id}</td>
        <td>${o.customer_name}<br><span style="color:var(--steel);font-size:0.8rem;">${o.customer_email}</span></td>
        <td>${new Date(o.created_at).toLocaleDateString()}</td>
        <td>${money(o.total)}</td>
        <td>
          <select data-status="${o.id}">
            ${['pending','paid','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-status]').forEach(sel => {
      sel.addEventListener('change', async () => {
        await Api.adminUpdateOrderStatus(sel.dataset.status, sel.value);
      });
    });
  }
  load();
}

// ---------------- Users ----------------
async function renderUserAdmin() {
  const tbody = document.querySelector('#admin-user-table tbody');
  const { users } = await Api.adminUsers();
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span class="status-tag ${u.role === 'admin' ? 'status-shipped' : 'status-paid'}">${u.role}</span></td>
      <td>${new Date(u.created_at).toLocaleDateString()}</td>
    </tr>`).join('');
}
