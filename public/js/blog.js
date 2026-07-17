// Get query param
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Format date helper
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// Markdown Parser Helper
function parseMarkdown(md) {
  let html = md;
  
  // Escaping raw HTML tags to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```code```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings (## Heading, # Heading)
  html = html.replace(/^\s*## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^\s*# (.*?)$/gm, '<h1>$1</h1>');
  html = html.replace(/^\s*### (.*?)$/gm, '<h3>$1</h3>');

  // Blockquotes (> text)
  html = html.replace(/^\s*&gt; (.*?)$/gm, '<blockquote>$1</blockquote>');

  // Bold (**text** or __text__)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italics (*text* or _text_)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Links ([label](url))
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="text-decoration:underline;">$1</a>');

  // Unordered Lists (* item)
  html = html.replace(/^\s*[\-\*] (.*?)$/gm, '<li>$1</li>');

  // Paragraph splits
  const blocks = html.split(/\n\n+/);
  html = blocks.map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<h') || block.startsWith('<pre') || block.startsWith('<block') || block.startsWith('<ul') || block.startsWith('<li')) {
      return block;
    }
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

// Render shimmer loading for article
function renderArticleShimmer() {
  const container = document.getElementById('articleContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="article-header">
      <div class="shimmer-text-meta shimmer" style="width: 100px; height: 20px;"></div>
      <div class="shimmer-title shimmer" style="height: 48px; margin-top: 16px; width: 90%;"></div>
      <div class="article-author-card">
        <div class="author-info">
          <div class="shimmer-text-meta shimmer" style="width: 140px; height: 16px;"></div>
          <div class="shimmer-text-meta shimmer" style="width: 100px; height: 14px; margin-top: 8px;"></div>
        </div>
        <div class="shimmer-footer shimmer" style="width: 80px; height: 36px; border-radius: 99px;"></div>
      </div>
    </div>
    <div class="shimmer" style="width: 100%; height: 380px; border-radius: 12px; margin-bottom: 40px;"></div>
    <div class="shimmer-desc shimmer" style="margin-bottom: 12px; height: 18px; width: 100%;"></div>
    <div class="shimmer-desc shimmer" style="margin-bottom: 12px; height: 18px; width: 95%;"></div>
    <div class="shimmer-desc-short shimmer" style="margin-bottom: 40px; height: 18px; width: 60%;"></div>
  `;
}

// Load blog details
async function loadBlogDetails(blogId) {
  const container = document.getElementById('articleContainer');
  if (!container) return;
  
  renderArticleShimmer();
  
  try {
    // Add artificial delay to appreciate shimmer effect (e.g. 600ms)
    await new Promise(resolve => setTimeout(resolve, 600));

    const data = await apiRequest(`/api/blogs/${blogId}`);
    const blog = data.blog;
    const isLiked = data.isLiked;
    
    // Highlight the active stream category in the global header
    window.currentBlogStream = blog.stream;
    if (typeof initNavbarStreams === 'function') {
      initNavbarStreams();
    }

    document.title = `${blog.title} - KnowledgeShare`;
    
    const coverHtml = blog.cover_image_path ? 
      `<img class="article-cover" src="${blog.cover_image_path}" alt="${blog.title}" onerror="handleImageError(this, '${blog.stream}')">` : '';
      
    const formattedDate = formatDate(blog.created_at);

    // Run the Markdown parser
    const bodyContentHtml = parseMarkdown(blog.content);

    container.innerHTML = `
      <div class="article-header">
        <div class="article-stream">
          <span class="badge">${blog.stream}</span>
        </div>
        <h1 class="article-title serif">${blog.title}</h1>
        <div class="article-author-card">
          <div class="author-info">
            <span class="author-name">@${blog.author_name}</span>
            <span class="article-date">Published ${formattedDate}</span>
          </div>
          <div>
            <!-- Like button -->
            <button id="likeBtn" class="like-button ${isLiked ? 'liked' : ''}">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="display:inline-block; vertical-align:middle;">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span id="likesCount" style="margin-left:4px; font-weight:600;">${blog.likes_count}</span>
            </button>
          </div>
        </div>
      </div>
      
      ${coverHtml}
      
      <div class="article-content serif">
        ${bodyContentHtml}
      </div>

      <div class="article-footer">
        <a href="index.html" class="btn btn-secondary">← Back to Feed</a>
      </div>
    `;

    // Bind like functionality
    const likeBtn = document.getElementById('likeBtn');
    if (likeBtn) {
      likeBtn.addEventListener('click', () => handleLikeToggle(blogId));
    }

    // Load related suggestions
    loadRelatedBlogs(blogId);

  } catch (err) {
    console.error('Error loading blog details:', err);
    container.innerHTML = `
      <div class="text-center text-muted" style="padding: 100px 0;">
        <h2 style="color: var(--danger-color); margin-bottom: 16px;">Story Not Found</h2>
        <p>${err.message}</p>
        <a href="index.html" class="btn btn-primary" style="margin-top: 24px;">Return to Feed</a>
      </div>
    `;
  }
}

// Like handler
async function handleLikeToggle(blogId) {
  const user = getUser();
  if (!user) {
    showToast('You must sign in to like this story.', 'error');
    setTimeout(() => {
      window.location.href = 'auth.html';
    }, 2000);
    return;
  }

  try {
    const data = await apiRequest(`/api/blogs/${blogId}/like`, { method: 'POST' });
    const likeBtn = document.getElementById('likeBtn');
    const likesCount = document.getElementById('likesCount');
    
    if (data.liked) {
      likeBtn.classList.add('liked');
      showToast('Story added to your likes.');
    } else {
      likeBtn.classList.remove('liked');
      showToast('Story removed from your likes.');
    }
    
    likesCount.innerText = data.likesCount;
  } catch (err) {
    console.error('Error toggling like:', err);
    showToast(err.message, 'error');
  }
}

// Related reads loader
async function loadRelatedBlogs(blogId) {
  const relatedGrid = document.getElementById('relatedGrid');
  if (!relatedGrid) return;
  
  relatedGrid.innerHTML = `
    <div class="shimmer-card" style="padding:16px; grid-template-columns:1fr; height: 260px;">
      <div class="shimmer" style="width:100%; height:120px; border-radius:8px;"></div>
      <div class="shimmer-text-meta shimmer" style="width:60px; margin-top:12px;"></div>
      <div class="shimmer-title shimmer" style="width:90%; height:20px; margin-top:8px;"></div>
    </div>
    <div class="shimmer-card" style="padding:16px; grid-template-columns:1fr; height: 260px;">
      <div class="shimmer" style="width:100%; height:120px; border-radius:8px;"></div>
      <div class="shimmer-text-meta shimmer" style="width:60px; margin-top:12px;"></div>
      <div class="shimmer-title shimmer" style="width:90%; height:20px; margin-top:8px;"></div>
    </div>
    <div class="shimmer-card" style="padding:16px; grid-template-columns:1fr; height: 260px;">
      <div class="shimmer" style="width:100%; height:120px; border-radius:8px;"></div>
      <div class="shimmer-text-meta shimmer" style="width:60px; margin-top:12px;"></div>
      <div class="shimmer-title shimmer" style="width:90%; height:20px; margin-top:8px;"></div>
    </div>
  `;
  
  try {
    const data = await apiRequest(`/api/blogs/${blogId}/related`);
    
    if (!data.related || data.related.length === 0) {
      relatedGrid.innerHTML = `<div class="text-muted" style="grid-column: 1 / -1;">No related articles found.</div>`;
      return;
    }

    relatedGrid.innerHTML = '';
    data.related.forEach(blog => {
      const coverImg = blog.cover_image_path || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=300&auto=format&fit=crop';
      
      const card = document.createElement('div');
      card.className = 'related-card';
      card.innerHTML = `
        <div class="related-card-image-wrapper">
          <img class="related-card-image" src="${coverImg}" alt="${blog.title}" onerror="handleImageError(this, '${blog.stream}')">
        </div>
        <div class="related-card-body">
          <div>
            <span class="badge" style="margin-bottom:8px;">${blog.stream}</span>
            <h4 class="related-card-title serif">${blog.title}</h4>
          </div>
          <div style="font-size:12px; color:var(--text-secondary); display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <span>@${blog.author_name}</span>
            <span style="display:inline-flex; align-items:center; gap:2px;">
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              ${blog.likes_count}
            </span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        window.location.href = `blog.html?id=${blog.id}`;
      });

      relatedGrid.appendChild(card);
    });

  } catch (err) {
    console.error('Error loading related blogs:', err);
    relatedGrid.innerHTML = `<div class="text-muted" style="grid-column: 1 / -1;">Error loading related posts.</div>`;
  }
}

// Initialize script
window.addEventListener('DOMContentLoaded', () => {
  const blogId = getQueryParam('id');
  if (blogId) {
    loadBlogDetails(blogId);
  } else {
    window.location.href = 'index.html';
  }
});
