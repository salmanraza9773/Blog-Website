// Check if user is already authenticated
if (getUser()) {
  window.location.href = 'index.html';
}

const loginTabBtn = document.getElementById('loginTabBtn');
const signupTabBtn = document.getElementById('signupTabBtn');
const loginView = document.getElementById('loginView');
const signupView = document.getElementById('signupView');
const forgotView = document.getElementById('forgotView');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const backToLoginBtn = document.getElementById('backToLoginBtn');

// Switch tabs
function switchAuthTab(target) {
  if (target === 'login') {
    loginTabBtn.classList.add('active');
    signupTabBtn.classList.remove('active');
    loginView.classList.add('active');
    signupView.classList.remove('active');
    if (forgotView) forgotView.classList.remove('active');
    document.title = 'Sign In - KnowledgeShare';
  } else if (target === 'signup') {
    signupTabBtn.classList.add('active');
    loginTabBtn.classList.remove('active');
    signupView.classList.add('active');
    loginView.classList.remove('active');
    if (forgotView) forgotView.classList.remove('active');
    document.title = 'Sign Up - KnowledgeShare';
  } else if (target === 'forgot') {
    loginTabBtn.classList.remove('active');
    signupTabBtn.classList.remove('active');
    loginView.classList.remove('active');
    signupView.classList.remove('active');
    if (forgotView) forgotView.classList.add('active');
    document.title = 'Reset Password - KnowledgeShare';
  }
}

if (loginTabBtn && signupTabBtn) {
  loginTabBtn.addEventListener('click', () => switchAuthTab('login'));
  signupTabBtn.addEventListener('click', () => switchAuthTab('signup'));
}

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('forgot');
  });
}

if (backToLoginBtn) {
  backToLoginBtn.addEventListener('click', () => switchAuthTab('login'));
}

// Handle login submission
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const btn = loginForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = 'Signing In...';

    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      saveToken(data.token);
      showToast('Welcome back to KnowledgeShare!');
      
      if (data.user && data.user.preferences && data.user.preferences.theme) {
        localStorage.setItem('theme', data.user.preferences.theme);
      }

      setTimeout(() => {
        window.location.href = data.user && data.user.role === 'admin' ? 'admin.html' : 'index.html';
      }, 1000);

    } catch (err) {
      console.error('Login error:', err);
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerText = 'Sign In';
    }
  });
}

// Handle registration submission
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    const btn = signupForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = 'Creating Account...';

    try {
      const data = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: { username, email, password }
      });

      saveToken(data.token);
      showToast('Account created successfully! Welcome.');
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1200);

    } catch (err) {
      console.error('Registration error:', err);
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerText = 'Create Account';
    }
  });
}

// Handle forgot password submission
const forgotForm = document.getElementById('forgotForm');
const forgotResultArea = document.getElementById('forgotResultArea');

if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();

    const btn = forgotForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = 'Sending Request...';

    if (forgotResultArea) {
      forgotResultArea.style.display = 'none';
      forgotResultArea.innerHTML = '';
    }

    try {
      const data = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email }
      });

      showToast('Password reset link sent!');
      btn.disabled = false;
      btn.innerText = 'Generate Reset Link';
      
      if (forgotResultArea) {
        forgotResultArea.style.display = 'block';
        forgotResultArea.innerHTML = `
          <div style="font-size: 14px; font-weight: 600; color: var(--success-color); margin-bottom: 6px;">
            ✓ Reset link dispatched to email
          </div>
          <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0;">
            If an account is associated with <strong>${email}</strong>, an email containing your password reset link has been sent. Please check your email inbox and spam folder.
          </p>
        `;
      }

    } catch (err) {
      console.error('Forgot password error:', err);
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerText = 'Generate Reset Link';
    }
  });
}
