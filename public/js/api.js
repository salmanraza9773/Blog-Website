const API_URL = ''; // Same origin

// Toast notifications helper
function showToast(message, type = 'success') {
  let toast = document.getElementById('toastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 4000);
}

// Token helper
function getToken() {
  return localStorage.getItem('jwt_token');
}

function saveToken(token) {
  localStorage.setItem('jwt_token', token);
}

function removeToken() {
  localStorage.removeItem('jwt_token');
}

function getUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      removeToken();
      return null;
    }
    return payload;
  } catch (e) {
    return null;
  }
}

// Fetch wrapper
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

// Init theme toggling
function initTheme() {
  const navLinks = document.querySelector('.nav-links');
  if (navLinks && !document.getElementById('themeToggleBtn')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'themeToggleBtn';
    toggleBtn.className = 'theme-toggle-btn';
    toggleBtn.title = 'Toggle Theme';
    toggleBtn.innerHTML = `
      <svg class="sun-icon" viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.01c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>
      <svg class="moon-icon" viewBox="0 0 24 24"><path d="M12.3 22h-.1c-5.5 0-10-4.5-10-10 0-4.8 3.5-8.9 8.2-9.8.6-.1 1.2.3 1.3.9.1.6-.2 1.2-.8 1.4-3.5 1.3-5.8 4.7-5.8 8.5 0 4.7 3.9 8.5 8.7 8.5 2.5 0 4.8-1.1 6.3-2.9.4-.5 1-.6 1.5-.3.5.3.7.9.5 1.4-1.7 3.8-5.5 6.3-9.8 6.3z"/></svg>
    `;
    navLinks.insertBefore(toggleBtn, navLinks.firstChild);
    toggleBtn.addEventListener('click', toggleTheme);
  }

  // Load theme preference
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
}

async function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-theme');
  const newTheme = isDark ? 'dark' : 'light';
  localStorage.setItem('theme', newTheme);
  
  const user = getUser();
  if (user) {
    try {
      const data = await apiRequest('/api/users/profile');
      const prefs = data.user.preferences || {};
      prefs.theme = newTheme;
      
      await apiRequest('/api/users/preferences', {
        method: 'PUT',
        body: { savedStreams: prefs.savedStreams || [], theme: newTheme }
      });
    } catch (e) {
      console.warn('Theme preferences sync failed:', e);
    }
  }
}

// Scroll header logic
function initScrollHeader() {
  const header = document.querySelector('header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 15) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }
}

// Underline dynamic navbar indicator
function initActiveNavLink() {
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';
  
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === page || (page === 'index.html' && href === '') || (page === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Init global header menu overlays
function initHeader() {
  const dropdownTrigger = document.getElementById('dropdownTrigger');
  const dropdownMenu = document.getElementById('dropdownMenu');
  
  if (dropdownTrigger && dropdownMenu) {
    dropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      dropdownMenu.classList.remove('show');
    });
  }

  const authArea = document.getElementById('authArea');
  if (authArea) {
    const user = getUser();
    if (user) {
      authArea.innerHTML = `
        <div class="dropdown" id="userProfileDropdown">
          <button class="dropdown-trigger" id="profileDropdownTrigger" style="font-weight: 600; font-family: var(--font-sans);">
            @${user.username} <span style="font-size: 10px;">▼</span>
          </button>
          <div class="dropdown-menu" id="profileDropdownMenu">
            <a class="dropdown-item" href="profile.html">Dashboard</a>
            <button class="dropdown-item" id="logoutBtn" style="border:none; background:none; text-align:left; width:100%; cursor:pointer;">Sign Out</button>
          </div>
        </div>
      `;
      
      const profTrigger = document.getElementById('profileDropdownTrigger');
      const profMenu = document.getElementById('profileDropdownMenu');
      if (profTrigger && profMenu) {
        profTrigger.addEventListener('click', (e) => {
          e.stopPropagation();
          profMenu.classList.toggle('show');
        });
        document.addEventListener('click', () => {
          profMenu.classList.remove('show');
        });
      }
      
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          removeToken();
          showToast('Signed out successfully.');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1000);
        });
      }
    } else {
      authArea.innerHTML = `<a href="auth.html" class="btn btn-primary">Sign In</a>`;
    }
  }
}

// Global Image Fallback Handler
function handleImageError(imgElement, streamName) {
  // Prevent loops
  imgElement.onerror = null;

  const placeholder = document.createElement('div');
  placeholder.className = 'fallback-image-card';
  if (imgElement.classList.contains('article-cover')) {
    placeholder.classList.add('article-cover');
  }
  placeholder.innerHTML = `<span>${streamName.toUpperCase()}</span>`;
  
  const computedStyle = window.getComputedStyle(imgElement);
  placeholder.style.borderRadius = computedStyle.borderRadius || '8px';
  
  imgElement.replaceWith(placeholder);
}

// DOM Setup
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initScrollHeader();
  initActiveNavLink();
  initHeader();
});
