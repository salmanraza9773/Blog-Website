// Protect page route: redirect if not logged in
const user = getUser();
if (!user) {
  showToast('You must sign in to view the dashboard.', 'error');
  setTimeout(() => {
    window.location.href = 'auth.html';
  }, 1000);
}

// Side nav tab switching
const menuItems = document.querySelectorAll('.profile-menu-item');
const sections = document.querySelectorAll('.profile-content-section');

menuItems.forEach(item => {
  item.addEventListener('click', () => {
    const target = item.getAttribute('data-target');
    
    // Toggle active menu item
    menuItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    // Toggle active section
    sections.forEach(s => {
      if (s.id === target) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });
  });
});

// Format date helper
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// Shimmer rendering
function renderDashboardShimmers() {
  const likedList = document.getElementById('likedStoriesList');
  const ownList = document.getElementById('ownStoriesList');
  
  if (likedList) {
    likedList.innerHTML = `
      <div class="list-view-item" style="border:none;">
        <div class="list-view-info">
          <div class="shimmer-text-meta shimmer" style="width: 250px; height: 16px;"></div>
          <div class="shimmer-text-meta shimmer" style="width: 120px; height: 14px; margin-top: 8px;"></div>
        </div>
      </div>
      <div class="list-view-item" style="border:none;">
        <div class="list-view-info">
          <div class="shimmer-text-meta shimmer" style="width: 200px; height: 16px;"></div>
          <div class="shimmer-text-meta shimmer" style="width: 100px; height: 14px; margin-top: 8px;"></div>
        </div>
      </div>
    `;
  }
  
  if (ownList) {
    ownList.innerHTML = `
      <div class="list-view-item" style="border:none;">
        <div class="list-view-info">
          <div class="shimmer-text-meta shimmer" style="width: 220px; height: 16px;"></div>
          <div class="shimmer-text-meta shimmer" style="width: 130px; height: 14px; margin-top: 8px;"></div>
        </div>
      </div>
    `;
  }
}

// Load Dashboard Data
let currentPreferences = { savedStreams: [] };

async function loadDashboard() {
  renderDashboardShimmers();
  
  try {
    // Add artificial delay to appreciate shimmer effect (e.g. 500ms)
    await new Promise(resolve => setTimeout(resolve, 500));

    const data = await apiRequest('/api/users/profile');
    const userProfile = data.user;
    const likedBlogs = data.likedBlogs;
    const ownBlogs = data.ownBlogs;

    // Greeting
    document.getElementById('dashboardGreeting').innerText = `@${userProfile.username}`;

    // Populating Account settings
    document.getElementById('settingsUsername').value = userProfile.username;
    document.getElementById('settingsEmail').value = userProfile.email;

    // Stream Selection highlighting
    currentPreferences = userProfile.preferences || { savedStreams: [] };
    const savedStreams = currentPreferences.savedStreams || [];
    
    const streamCards = document.querySelectorAll('#profileStreamGrid .stream-card');
    streamCards.forEach(card => {
      const streamName = card.getAttribute('data-stream');
      if (savedStreams.includes(streamName)) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    // Populate Liked Stories List
    const likedList = document.getElementById('likedStoriesList');
    if (likedList) {
      if (likedBlogs.length === 0) {
        likedList.innerHTML = `<div class="text-muted" style="padding: 20px 0;">No liked stories yet.</div>`;
      } else {
        likedList.innerHTML = '';
        likedBlogs.forEach(blog => {
          const item = document.createElement('div');
          item.className = 'list-view-item';
          item.innerHTML = `
            <div class="list-view-info">
              <a href="blog.html?id=${blog.id}" class="list-view-title serif">${blog.title}</a>
              <div class="list-view-meta">
                <span>by @${blog.author_name}</span>
                <span>·</span>
                <span>${formatDate(blog.created_at)}</span>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge">${blog.stream}</span>
              <span style="font-size:13px; color:var(--text-secondary); display:inline-flex; align-items:center; gap:2px;">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                ${blog.likes_count}
              </span>
            </div>
          `;
          likedList.appendChild(item);
        });
      }
    }

    // Populate Own Stories List
    const ownList = document.getElementById('ownStoriesList');
    if (ownList) {
      if (ownBlogs.length === 0) {
        ownList.innerHTML = `<div class="text-muted" style="padding: 20px 0;">You haven't written any stories yet.</div>`;
      } else {
        ownList.innerHTML = '';
        ownBlogs.forEach(blog => {
          const item = document.createElement('div');
          item.className = 'list-view-item';
          item.innerHTML = `
            <div class="list-view-info">
              <a href="blog.html?id=${blog.id}" class="list-view-title serif">${blog.title}</a>
              <div class="list-view-meta">
                <span>Published ${formatDate(blog.created_at)}</span>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge">${blog.stream}</span>
              <span style="font-size:13px; color:var(--text-secondary); display:inline-flex; align-items:center; gap:2px;">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                ${blog.likes_count}
              </span>
            </div>
          `;
          ownList.appendChild(item);
        });
      }
    }

  } catch (err) {
    console.error('Error loading dashboard data:', err);
    showToast(err.message, 'error');
  }
}

// Bind Stream Cards Selection Toggle
const streamCardsGrid = document.getElementById('profileStreamGrid');
if (streamCardsGrid) {
  streamCardsGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.stream-card');
    if (!card) return;
    card.classList.toggle('selected');
  });
}

// Save Stream Preferences
const saveStreamsBtn = document.getElementById('saveStreamsBtn');
if (saveStreamsBtn) {
  saveStreamsBtn.addEventListener('click', async () => {
    const selectedCards = document.querySelectorAll('#profileStreamGrid .stream-card.selected');
    const savedStreams = Array.from(selectedCards).map(card => card.getAttribute('data-stream'));

    saveStreamsBtn.disabled = true;
    saveStreamsBtn.innerText = 'Saving...';

    try {
      // Retain existing theme preference
      const activeTheme = localStorage.getItem('theme') || 'light';
      await apiRequest('/api/users/preferences', {
        method: 'PUT',
        body: { savedStreams, theme: activeTheme }
      });
      showToast('Stream preferences updated successfully!');
    } catch (err) {
      console.error('Error saving stream preferences:', err);
      showToast(err.message, 'error');
    } finally {
      saveStreamsBtn.disabled = false;
      saveStreamsBtn.innerText = 'Save Stream Preferences';
    }
  });
}

// Save Settings Form
const settingsForm = document.getElementById('settingsForm');
if (settingsForm) {
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('settingsUsername').value.trim();
    const email = document.getElementById('settingsEmail').value.trim();
    const password = document.getElementById('settingsPassword').value;

    const btn = settingsForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = 'Saving...';

    try {
      const body = { username, email };
      if (password) {
        body.password = password;
      }

      await apiRequest('/api/users/settings', {
        method: 'PUT',
        body
      });

      showToast('Account settings updated successfully!');
      document.getElementById('settingsPassword').value = '';
      
      // Reload dashboard greeting
      loadDashboard();
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Save Settings';
    }
  });
}

// Initialize Script
window.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});
