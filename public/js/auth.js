// Check if user is already authenticated
if (getUser()) {
  window.location.href = 'index.html';
}

const authContainer = document.getElementById('authContainer');
const switchToSignup = document.getElementById('switchToSignup');
const switchToLogin = document.getElementById('switchToLogin');

// Toggle sliding view states
if (switchToSignup && switchToLogin && authContainer) {
  switchToSignup.addEventListener('click', () => {
    authContainer.classList.add('signup-active');
    document.title = 'Sign Up - KnowledgeShare';
  });

  switchToLogin.addEventListener('click', () => {
    authContainer.classList.remove('signup-active');
    document.title = 'Sign In - KnowledgeShare';
  });
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
      
      // Load user theme preference if any
      if (data.user && data.user.preferences && data.user.preferences.theme) {
        localStorage.setItem('theme', data.user.preferences.theme);
      }

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1200);

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
