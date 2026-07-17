let currentStream = 'All';

// Parse query params
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Format snippet helper
function getSnippet(content, length = 160) {
  const stripped = content.replace(/<[^>]*>/g, '').replace(/[\#\*\_\[\]\-\`]/g, ''); // strip markdown chars too!
  if (stripped.length <= length) return stripped;
  return stripped.substring(0, length) + '...';
}

// Format date helper
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// Render shimmer loading skeletons
function renderShimmers(count = 3) {
  const blogList = document.getElementById('blogList');
  if (!blogList) return;
  
  let shimmerHtml = '';
  for (let i = 0; i < count; i++) {
    shimmerHtml += `
      <div class="shimmer-card">
        <div class="blog-card-content">
          <div>
            <div class="shimmer-text-meta shimmer"></div>
            <div class="shimmer-title shimmer"></div>
            <div class="shimmer-desc shimmer"></div>
            <div class="shimmer-desc-short shimmer"></div>
          </div>
          <div class="shimmer-footer shimmer"></div>
        </div>
        <div class="shimmer-img shimmer"></div>
      </div>
    `;
  }
  blogList.innerHTML = shimmerHtml;
}

// Fetch and render blogs
async function loadBlogs(stream) {
  const blogList = document.getElementById('blogList');
  if (!blogList) return;
  
  // Show skeleton shimmer states first
  renderShimmers(3);
  
  try {
    // Add artificial delay to appreciate shimmer effect (e.g. 600ms)
    await new Promise(resolve => setTimeout(resolve, 600));

    const url = stream && stream !== 'All' ? `/api/blogs?stream=${stream}` : '/api/blogs';
    const data = await apiRequest(url);
    
    if (!data.blogs || data.blogs.length === 0) {
      blogList.innerHTML = `
        <div class="text-center text-muted" style="padding: 60px 0;">
          <p style="font-size: 18px; margin-bottom: 8px;">No stories found in this stream yet.</p>
          <a href="create.html" class="btn btn-secondary" style="margin-top: 12px;">Be the first to share</a>
        </div>
      `;
      return;
    }

    blogList.innerHTML = '';
    data.blogs.forEach(blog => {
      const coverImg = blog.cover_image_path || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=300&auto=format&fit=crop';
      const snippet = getSnippet(blog.content);
      const formattedDate = formatDate(blog.created_at);
      
      const card = document.createElement('div');
      card.className = 'blog-card';
      card.innerHTML = `
        <div class="blog-card-content">
          <div>
            <div class="blog-card-meta">
              <span class="blog-card-author">@${blog.author_name}</span>
              <span>·</span>
              <span>${formattedDate}</span>
            </div>
            <h2 class="blog-card-title serif">${blog.title}</h2>
            <p class="blog-card-snippet serif">${snippet}</p>
          </div>
          <div class="blog-card-footer">
            <span class="badge">${blog.stream}</span>
            <span style="display: inline-flex; align-items: center; gap: 4px;">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              ${blog.likes_count}
            </span>
          </div>
        </div>
        <div class="blog-card-image-wrapper">
          <img class="blog-card-image" src="${coverImg}" alt="${blog.title}" onerror="handleImageError(this, '${blog.stream}')">
        </div>
      `;

      card.addEventListener('click', () => {
        window.location.href = `blog.html?id=${blog.id}`;
      });

      blogList.appendChild(card);
    });
  } catch (err) {
    console.error('Error loading blogs:', err);
    blogList.innerHTML = `<div class="text-center text-muted" style="padding: 40px 0; color: var(--danger-color);">Error loading articles: ${err.message}</div>`;
  }
}

// Handle active subnav state in the main navbar
function setActiveTab(stream) {
  const navStreams = document.getElementById('navStreams');
  if (!navStreams) return;
  
  const tabs = navStreams.querySelectorAll('.stream-tab');
  tabs.forEach(tab => {
    if (tab.getAttribute('data-stream') === stream) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  updateNavIndicator();
}

// Set up listeners
function setupTabs() {
  const navStreams = document.getElementById('navStreams');
  if (navStreams) {
    navStreams.addEventListener('click', (e) => {
      const tab = e.target.closest('.stream-tab');
      if (!tab) return;
      
      // Prevent default page reload
      e.preventDefault();
      
      const stream = tab.getAttribute('data-stream');
      currentStream = stream;
      
      const newUrl = stream === 'All' ? 'index.html' : `index.html?stream=${stream}`;
      window.history.pushState({ stream }, '', newUrl);
      
      setActiveTab(stream);
      loadBlogs(stream);
    });
  }

  // Handle browser back/forward buttons
  window.addEventListener('popstate', (e) => {
    const stream = (e.state && e.state.stream) || getQueryParam('stream') || 'All';
    currentStream = stream;
    setActiveTab(stream);
    loadBlogs(stream);
  });
}

// Initial script runner
window.addEventListener('DOMContentLoaded', () => {
  const streamQuery = getQueryParam('stream') || 'All';
  currentStream = streamQuery;
  setActiveTab(streamQuery);
  loadBlogs(streamQuery);
  setupTabs();
  
  // Wait a small duration to calculate initial dimensions
  setTimeout(updateNavIndicator, 200);
});
