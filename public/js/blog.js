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

// Markdown Parser Helper with Tables, CTA Boxes, and Pros/Cons support
function parseMarkdown(md) {
  if (!md) return '';
  let html = md;
  
  // Escaping raw HTML tags to prevent XSS (except allowed tags)
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```code```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // CTA Box shortcode: [CTA_BOX title="..." price="..." specs="..." link="..." button="..."]
  html = html.replace(/\[CTA_BOX title="([^"]+)" price="([^"]+)" specs="([^"]+)" link="([^"]+)" button="([^"]+)"\]/g, (match, title, price, specs, link, button) => {
    const specPills = specs.split(',').map(s => `<span class="cta-spec-pill">${s.trim()}</span>`).join('');
    return `
      <div class="affiliate-cta-box">
        <div class="cta-header">
          <div class="cta-title">${title}</div>
          <span class="cta-price-tag">${price}</span>
        </div>
        <div class="cta-specs">${specPills}</div>
        <a href="${link}" target="_blank" rel="nofollow sponsored" class="cta-button">
          <span>${button}</span>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
        </a>
      </div>
    `;
  });

  // Markdown Tables (| Header | Header |\n| --- | --- |\n| Cell | Cell |)
  html = html.replace(/^\|(.+)\|\r?\n\|( *[-:]+[-| :]*)\|\r?\n((?:\|.+\|\r?\n?)*)/gm, (match, headerRow, separatorRow, bodyRows) => {
    const headers = headerRow.split('|').map(h => h.trim()).filter(h => h.length > 0);
    const ths = headers.map(h => `<th>${h}</th>`).join('');

    const rows = bodyRows.trim().split('\n').map(row => {
      const cells = row.split('|').map(c => c.trim()).filter(c => c.length > 0);
      const tds = cells.map(c => `<td>${c}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('\n');

    return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
  });

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
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="nofollow sponsored" style="text-decoration:underline;">$1</a>');

  // Unordered Lists (* item)
  html = html.replace(/^\s*[\-\*] (.*?)$/gm, '<li>$1</li>');

  // Paragraph splits
  const blocks = html.split(/\n\n+/);
  html = blocks.map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<h') || block.startsWith('<pre') || block.startsWith('<block') || block.startsWith('<ul') || block.startsWith('<li') || block.startsWith('<table') || block.startsWith('<div')) {
      return block;
    }
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

// Helper to inject Display Ad Placeholders
function injectAdSlots(htmlContent) {
  let paragraphs = htmlContent.split('</p>');
  let resultHtml = '';

  const adSlot1 = `
    <div class="ad-slot-in-article">
      <div class="ad-label">Sponsored / Advertisement</div>
      <div class="ad-content-placeholder">
        [AdSense Display Unit - Responsive In-Article Banner (Slot 1)]
      </div>
    </div>
  `;

  const adSlot2 = `
    <div class="ad-slot-in-article">
      <div class="ad-label">Sponsored / Advertisement</div>
      <div class="ad-content-placeholder">
        [AdSense Display Unit - High-Impact Verdict Banner (Slot 2)]
      </div>
    </div>
  `;

  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].trim().length > 0) {
      resultHtml += paragraphs[i] + '</p>';
    }

    // Insert Slot 1 after 2nd paragraph
    if (i === 1) {
      resultHtml += adSlot1;
    }

    // Insert Slot 2 before Conclusion/Verdict or mid-way
    if (i === Math.floor(paragraphs.length * 0.75) && paragraphs.length > 4) {
      resultHtml += adSlot2;
    }
  }

  return resultHtml;
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
    await new Promise(resolve => setTimeout(resolve, 500));

    const data = await apiRequest(`/api/blogs/${blogId}`);
    const blog = data.blog;
    const isLiked = data.isLiked;
    
    // Highlight active stream category
    window.currentBlogStream = blog.stream;
    if (typeof initNavbarStreams === 'function') {
      initNavbarStreams();
    }

    document.title = `${blog.title} - KnowledgeShare`;
    
    const coverHtml = blog.cover_image_path ? 
      `<img class="article-cover" src="${blog.cover_image_path}" alt="${blog.title}" onerror="handleImageError(this, '${blog.stream}')">` : '';
      
    const formattedDate = formatDate(blog.created_at);
    const readTimeHtml = blog.estimated_read_time ? `<span style="margin-left: 12px; color: var(--text-secondary);">• ${blog.estimated_read_time}</span>` : '';
    const summaryHtml = blog.summary ? `<p class="article-summary" style="font-size: 18px; color: var(--text-secondary); line-height: 1.6; margin: 16px 0 24px 0; font-style: italic;">${blog.summary}</p>` : '';

    // Run Markdown parser and inject ad slots
    const parsedHtml = parseMarkdown(blog.content);
    const bodyContentHtml = injectAdSlots(parsedHtml);

    // Primary CTA Box if affiliate is enabled
    let primaryCtaHtml = '';
    if (blog.affiliate_enabled && blog.primary_cta_text && blog.primary_cta_url !== '#') {
      primaryCtaHtml = `
        <div class="affiliate-cta-box" style="margin-top: 40px;">
          <div class="cta-header">
            <div>
              <div class="cta-title">Featured Partner Deal: ${blog.title}</div>
              <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">Verified Stock & Best Price Guarantee</p>
            </div>
            <span class="cta-price-tag">Top Value</span>
          </div>
          <a href="${blog.primary_cta_url}" target="_blank" rel="nofollow sponsored" class="cta-button">
            <span>${blog.primary_cta_text}</span>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="article-header">
        <div class="article-stream">
          <span class="badge">${blog.stream}</span>
          ${readTimeHtml}
        </div>
        <h1 class="article-title serif">${blog.title}</h1>
        ${summaryHtml}
        <div class="article-author-card">
          <div class="author-info">
            <span class="author-name">@${blog.author_name}</span>
            <span class="article-date">Published ${formattedDate}</span>
          </div>
          <div>
            <button id="likeBtn" class="like-button ${isLiked ? 'liked' : ''}">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="display:inline-block; vertical-align:middle;">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span id="likesCount" style="margin-left:4px; font-weight:600;">${blog.likes_count}</span>
            </button>
          </div>
        </div>

        <!-- Sticky FTC Affiliate Disclosure Banner -->
        <div class="ftc-disclosure-banner">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span><strong>Editorial Disclosure:</strong> When you buy through links on our site, we may earn an affiliate commission at no extra cost to you. <a href="disclosure.html" target="_blank">Read our full policy</a>.</span>
        </div>
      </div>
      
      ${coverHtml}
      
      <div class="article-content serif">
        ${bodyContentHtml}
        ${primaryCtaHtml}
      </div>

      <!-- Persistent Footer Ad Slot (Slot 3) -->
      <div class="ad-slot-footer">
        <div class="ad-label">Sponsored / Advertisement</div>
        <div class="ad-content-placeholder">
          [AdSense Persistent Banner - Footer Display Unit (Slot 3)]
        </div>
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
