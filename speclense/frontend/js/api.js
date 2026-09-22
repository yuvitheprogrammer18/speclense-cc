// ============================================================
// Point this at your backend. For local dev with the backend
// running via `npm run dev`, the default below is correct.
// After deploying the API (EC2 / Elastic Beanstalk / etc. behind
// AWS), change this to that public URL, e.g.
// "https://api.speclense.com/api" or an EC2 public DNS + /api.
// ============================================================
const API_BASE = window.SPECLENSE_API_BASE || 'http://localhost:5000/api';

async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('speclense_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok) {
    const err = new Error(data.message || 'Something went wrong.');
    err.status = res.status;
    throw err;
  }
  return data;
}

const Api = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload }),
  forgotPassword: (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } }),
  me: () => apiRequest('/auth/me', { auth: true }),

  getProducts: (query = '') => apiRequest(`/products${query}`),
  getProduct: (slug) => apiRequest(`/products/${slug}`),
  getCategories: () => apiRequest('/products/categories'),

  placeOrder: (payload) => apiRequest('/orders', { method: 'POST', body: payload, auth: true }),
  myOrders: () => apiRequest('/orders/mine', { auth: true }),

  adminSummary: () => apiRequest('/admin/summary', { auth: true }),
  adminCreateProduct: (payload) => apiRequest('/admin/products', { method: 'POST', body: payload, auth: true }),
  adminUpdateProduct: (id, payload) => apiRequest(`/admin/products/${id}`, { method: 'PUT', body: payload, auth: true }),
  adminDeleteProduct: (id) => apiRequest(`/admin/products/${id}`, { method: 'DELETE', auth: true }),
  adminOrders: () => apiRequest('/admin/orders', { auth: true }),
  adminUpdateOrderStatus: (id, status) => apiRequest(`/admin/orders/${id}/status`, { method: 'PUT', body: { status }, auth: true }),
  adminUsers: () => apiRequest('/admin/users', { auth: true })
};
