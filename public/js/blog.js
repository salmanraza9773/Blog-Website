// Helper to get query parameters
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Format date helper
function formatDate(dateString) {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// HTML escape helper to prevent XSS and tag leakage
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Markdown Parser Helper with Tables, CTA Boxes, and Lists
function parseMarkdown(md) {
  if (!md) return '';
  let text = md.trim();

  // Strip legacy pros-cons HTML if embedded in markdown body so structured cards don't collide
  text = text.replace(/<div class="pros-cons-grid">[\s\S]*?<\/div>\s*<\/div>/gi, '');
  text = text.replace(/## Pros & Cons Breakdown/gi, '');

  // 1. Code blocks (```code```)
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // 2. Inline code (`code`)
  text = text.replace(/`([^`]+)`/g, (match, code) => {
    return `<code>${escapeHtml(code)}</code>`;
  });

  // 3. CTA Box shortcode: [CTA_BOX title="..." price="..." specs="..." link="..." button="..."]
  text = text.replace(/\[CTA_BOX title="([^"]+)" price="([^"]+)" specs="([^"]+)" link="([^"]+)" button="([^"]+)"\]/g, (match, title, price, specs, link, button) => {
    const specPills = specs.split(',').map(s => `<span class="cta-spec-pill">${escapeHtml(s.trim())}</span>`).join('');
    return `
      <div class="affiliate-cta-box">
        <div class="cta-header">
          <div class="cta-title">${escapeHtml(title)}</div>
          <span class="cta-price-tag">${escapeHtml(price)}</span>
        </div>
        <div class="cta-specs">${specPills}</div>
        <a href="${escapeHtml(link)}" target="_blank" rel="nofollow sponsored" class="cta-button">
          <span>${escapeHtml(button)}</span>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
        </a>
      </div>
    `;
  });

  // 4. Markdown Tables (| Header | Header |\n| --- | --- |\n| Cell | Cell |)
  text = text.replace(/^\|(.+)\|\r?\n\|( *[-:]+[-| :]*)\|\r?\n((?:\|.+\|\r?\n?)*)/gm, (match, headerRow, separatorRow, bodyRows) => {
    const headers = headerRow.split('|').map(h => h.trim()).filter(h => h.length > 0);
    const ths = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');

    const rows = bodyRows.trim().split('\n').map(row => {
      const cells = row.split('|').map(c => c.trim()).filter(c => c.length > 0);
      const tds = cells.map(c => `<td>${escapeHtml(c)}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('\n');

    return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // 5. Headings (# Heading, ## Heading, ### Heading)
  text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // 6. Blockquotes (> text)
  text = text.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
  text = text.replace(/<\/blockquote>\s*<blockquote>/g, '<br>');

  // 7. Unordered Lists (group consecutive items into <ul>)
  text = text.replace(/((?:^[ \t]*[\-\*] .*\r?\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map(line => {
      const content = line.replace(/^[ \t]*[\-\*] /, '').trim();
      return `<li>${content}</li>`;
    }).join('\n');
    return `<ul>\n${items}\n</ul>`;
  });

  // 8. Ordered Lists (group consecutive items into <ol>)
  text = text.replace(/((?:^[ \t]*\d+\. .*\r?\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map(line => {
      const content = line.replace(/^[ \t]*\d+\. /, '').trim();
      return `<li>${content}</li>`;
    }).join('\n');
    return `<ol>\n${items}\n</ol>`;
  });

  // 9. Inline styling (Bold, Italics, Links)
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="nofollow sponsored" style="text-decoration:underline;">$1</a>');

  // 10. Horizontal rules
  text = text.replace(/^---$/gm, '<hr>');

  // 11. Paragraph splits
  const blocks = text.split(/\n\s*\n/);
  const parsedBlocks = blocks.map(block => {
    const b = block.trim();
    if (!b) return '';
    if (b.startsWith('<h1') || b.startsWith('<h2') || b.startsWith('<h3') || 
        b.startsWith('<h4') || b.startsWith('<h5') || b.startsWith('<table') || 
        b.startsWith('<ul') || b.startsWith('<ol') || b.startsWith('<div') || 
        b.startsWith('<blockquote') || b.startsWith('<pre') || b.startsWith('<hr')) {
      return b;
    }
    return `<p>${b.replace(/\n/g, '<br>')}</p>`;
  });

  return parsedBlocks.filter(Boolean).join('\n\n');
}

// Injects self-collapsing Ad Slots (remains display:none when :empty without placeholder borders or labels)
function injectAdSlots(htmlContent) {
  const paragraphs = htmlContent.split('</p>');
  if (paragraphs.length <= 2) {
    return htmlContent;
  }

  let resultHtml = '';
  const adSlot1 = `<div class="ad-slot-in-article" id="ad-slot-article-1"></div>`;
  const adSlot2 = `<div class="ad-slot-in-article" id="ad-slot-article-2"></div>`;

  const midPoint = Math.floor(paragraphs.length * 0.65);

  for (let i = 0; i < paragraphs.length; i++) {
    const part = paragraphs[i].trim();
    if (part.length > 0) {
      resultHtml += part + '</p>';
    }

    // Insert Slot 1 after 2nd paragraph
    if (i === 1) {
      resultHtml += adSlot1;
    }

    // Insert Slot 2 mid-way if article is sufficiently long
    if (i === midPoint && paragraphs.length > 5) {
      resultHtml += adSlot2;
    }
  }

  return resultHtml;
}

// Structured Pros and Cons Renderer
function renderProsCons(prosJson, consJson) {
  let pros = [];
  let cons = [];

  try {
    pros = typeof prosJson === 'string' ? JSON.parse(prosJson) : (prosJson || []);
  } catch (e) { pros = []; }

  try {
    cons = typeof consJson === 'string' ? JSON.parse(consJson) : (consJson || []);
  } catch (e) { cons = []; }

  if (!Array.isArray(pros)) pros = [];
  if (!Array.isArray(cons)) cons = [];

  if (pros.length === 0 && cons.length === 0) return '';

  const prosListHtml = pros.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const consListHtml = cons.map(item => `<li>${escapeHtml(item)}</li>`).join('');

  return `
    <div class="pros-cons-grid">
      <div class="pro-card">
        <h5>✓ Key Advantages</h5>
        <ul>${prosListHtml}</ul>
      </div>
      <div class="con-card">
        <h5>✕ Key Considerations</h5>
        <ul>${consListHtml}</ul>
      </div>
    </div>
  `;
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
      `<img class="article-cover" src="${blog.cover_image_path}" alt="${escapeHtml(blog.title)}" onerror="handleImageError(this, '${blog.stream}')">` : '';
      
    const formattedDate = formatDate(blog.created_at);
    const readTimeHtml = blog.estimated_read_time ? `<span style="margin-left: 12px; color: var(--text-secondary);">• ${escapeHtml(blog.estimated_read_time)}</span>` : '';
    const summaryHtml = blog.summary ? `<p class="article-summary" style="font-size: 18px; color: var(--text-secondary); line-height: 1.6; margin: 16px 0 24px 0; font-style: italic;">${escapeHtml(blog.summary)}</p>` : '';

    // Run Markdown parser and inject ad slots
    const parsedHtml = parseMarkdown(blog.content);
    const bodyContentHtml = injectAdSlots(parsedHtml);

    // Structured Pros and Cons
    const prosConsHtml = renderProsCons(blog.pros_json, blog.cons_json);

    // Primary CTA Box if affiliate is enabled
    let primaryCtaHtml = '';
    if (blog.affiliate_enabled && blog.primary_cta_text && blog.primary_cta_url && blog.primary_cta_url !== '#') {
      primaryCtaHtml = `
        <div class="affiliate-cta-box" style="margin-top: 40px;">
          <div class="cta-header">
            <div>
              <div class="cta-title">Featured Partner Deal: ${escapeHtml(blog.title)}</div>
              <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">Verified Stock & Best Price Guarantee</p>
            </div>
            <span class="cta-price-tag">Top Value</span>
          </div>
          <a href="${escapeHtml(blog.primary_cta_url)}" target="_blank" rel="nofollow sponsored" class="cta-button">
            <span>${escapeHtml(blog.primary_cta_text)}</span>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
        </div>
      `;
    }

    // Admin action buttons if logged in as admin
    const user = getUser();
    const isAdmin = user && (user.role === 'super_admin' || user.role === 'admin');
    const manageControlsHtml = isAdmin ? `
      <div style="margin-top: 12px;">
        <a href="admin.html?edit=${blog.id}#editor" class="action-btn-sm" style="display:inline-block; padding: 6px 14px; border-radius: 99px; text-decoration:none; color: #2563eb; border-color: #2563eb;">✏️ Edit in Studio</a>
      </div>
    ` : '';

    container.innerHTML = `
      <div class="article-header">
        <div class="article-stream">
          <span class="badge">${escapeHtml(blog.stream)}</span>
          ${readTimeHtml}
        </div>
        <h1 class="article-title serif">${escapeHtml(blog.title)}</h1>
        ${summaryHtml}
        <div class="article-author-card">
          <div class="author-info">
            <span class="author-name">By ${escapeHtml(blog.author_name || 'Super Admin')}</span>
            <span class="article-date">Published ${formattedDate}</span>
            ${manageControlsHtml}
          </div>
          <div>
            <button id="likeBtn" class="like-button ${isLiked ? 'liked' : ''}">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="display:inline-block; vertical-align:middle;">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span id="likesCount" style="margin-left:4px; font-weight:600;">${blog.likes_count || 0}</span>
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
        ${prosConsHtml}
        ${primaryCtaHtml}
      </div>

      <!-- Self-Collapsing Footer Ad Slot -->
      <div class="ad-slot-footer" id="ad-slot-footer"></div>

      <div class="article-footer" style="margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border-color);">
        <a href="index.html" class="btn btn-secondary">← Back to Publication Feed</a>
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
  try {
    const data = await apiRequest(`/api/blogs/${blogId}/like`, { method: 'POST' });
    const likeBtn = document.getElementById('likeBtn');
    const likesCount = document.getElementById('likesCount');
    
    if (data.liked) {
      likeBtn.classList.add('liked');
      showToast('Article appreciated.');
    } else {
      likeBtn.classList.remove('liked');
      showToast('Appreciation removed.');
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
          <img class="related-card-image" src="${coverImg}" alt="${escapeHtml(blog.title)}" onerror="handleImageError(this, '${blog.stream}')">
        </div>
        <div class="related-card-body">
          <div>
            <span class="badge" style="margin-bottom:8px;">${escapeHtml(blog.stream)}</span>
            <h4 class="related-card-title serif">${escapeHtml(blog.title)}</h4>
          </div>
          <div style="font-size:12px; color:var(--text-secondary); display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <span>By ${escapeHtml(blog.author_name || 'Editorial Team')}</span>
            <span style="display:inline-flex; align-items:center; gap:2px;">
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              ${blog.likes_count || 0}
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
