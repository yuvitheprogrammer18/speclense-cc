// ---- Session helpers, shared by every page ----
const Session = {
  get token() { return localStorage.getItem('speclense_token'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('speclense_user') || 'null'); }
    catch { return null; }
  },
  save(token, user) {
    localStorage.setItem('speclense_token', token);
    localStorage.setItem('speclense_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('speclense_token');
    localStorage.removeItem('speclense_user');
  },
  isLoggedIn() { return !!this.token; },
  isAdmin() { return this.user?.role === 'admin'; }
};

function showMsg(el, message, type = 'error') {
  el.textContent = message;
  el.className = `form-msg show ${type}`;
}

// ---- Reflect login state in the header (call on every storefront page) ----
function paintAuthNav() {
  const slot = document.getElementById('nav-auth-slot');
  if (!slot) return;
  if (Session.isLoggedIn()) {
    slot.innerHTML = `
      <a href="account.html" class="icon-link" title="My account">${Session.user.name.split(' ')[0]}</a>
      <a href="#" id="logout-link" class="icon-link" title="Log out">Log out</a>`;
    document.getElementById('logout-link').addEventListener('click', (e) => {
      e.preventDefault();
      Session.clear();
      window.location.href = 'index.html';
    });
  } else {
    slot.innerHTML = `<a href="login.html" class="icon-link">Log in</a>`;
  }
}

// ---- Page-specific handlers ----
document.addEventListener('DOMContentLoaded', () => {
  paintAuthNav();

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('form-msg');
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      try {
        const { token, user } = await Api.login({ email, password });
        Session.save(token, user);
        const redirect = new URLSearchParams(location.search).get('redirect');
        window.location.href = redirect || 'index.html';
      } catch (err) {
        showMsg(msg, err.message);
      }
    });
  }

  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('form-msg');
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirm = document.getElementById('confirm').value;
      if (password !== confirm) return showMsg(msg, 'Passwords do not match.');
      try {
        const { token, user } = await Api.register({ name, email, password });
        Session.save(token, user);
        window.location.href = 'index.html';
      } catch (err) {
        showMsg(msg, err.message);
      }
    });
  }

  const forgotForm = document.getElementById('forgot-form');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('form-msg');
      const email = document.getElementById('email').value.trim();
      try {
        const { message } = await Api.forgotPassword(email);
        showMsg(msg, message, 'success');
        forgotForm.querySelector('button').disabled = true;
      } catch (err) {
        showMsg(msg, err.message);
      }
    });
  }

  const resetForm = document.getElementById('reset-form');
  if (resetForm) {
    const token = new URLSearchParams(location.search).get('token');
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('form-msg');
      const password = document.getElementById('password').value;
      const confirm = document.getElementById('confirm').value;
      if (!token) return showMsg(msg, 'Missing or invalid reset link.');
      if (password !== confirm) return showMsg(msg, 'Passwords do not match.');
      try {
        const { message } = await Api.resetPassword(token, password);
        showMsg(msg, message + ' Redirecting to login…', 'success');
        setTimeout(() => (window.location.href = 'login.html'), 1600);
      } catch (err) {
        showMsg(msg, err.message);
      }
    });
  }
});
