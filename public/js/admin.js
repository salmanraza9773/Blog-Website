// State variables
let adminArticles = [];
let currentPros = [];
let currentCons = [];
let pendingDeleteBlogId = null;
let selectedCoverFile = null;

// Ensure helper functions are available even if scripts load asynchronously
if (typeof escapeHtml !== 'function') {
  window.escapeHtml = function(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  };
}
if (typeof formatDate !== 'function') {
  window.formatDate = function(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
}
if (typeof parseMarkdown !== 'function') {
  window.parseMarkdown = function(md) {
    if (!md) return '';
    return md.replace(/\n\n+/g, '</p><p>').replace(/^## (.*$)/gm, '<h2>$1</h2>');
  };
}

async function verifyAdminSession() {
  const token = getToken();
  const gatekeeperModal = document.getElementById('gatekeeperModal');
  const adminStudioApp = document.getElementById('adminStudioApp');

  if (!token) {
    showGatekeeperModal();
    return false;
  }

  try {
    const data = await apiRequest('/api/admin/verify');
    if (data.verified) {
      if (gatekeeperModal) gatekeeperModal.style.display = 'none';
      if (adminStudioApp) adminStudioApp.style.display = 'block';
      return true;
    } else {
      removeToken();
      showGatekeeperModal();
      return false;
    }
  } catch (err) {
    console.warn('Admin session verification failed:', err.message);
    removeToken();
    showGatekeeperModal();
    return false;
  }
}

function showGatekeeperModal() {
  const gatekeeperModal = document.getElementById('gatekeeperModal');
  const adminStudioApp = document.getElementById('adminStudioApp');
  if (gatekeeperModal) gatekeeperModal.style.display = 'flex';
  if (adminStudioApp) adminStudioApp.style.display = 'none';
}

// Handle Gatekeeper Passkey Submission
async function handleGatekeeperLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('gatekeeperUsername');
  const passkeyInput = document.getElementById('gatekeeperPasskey');
  const errorBox = document.getElementById('gatekeeperError');
  const submitBtn = document.getElementById('gatekeeperSubmitBtn');

  const username = usernameInput ? usernameInput.value.trim() : '';
  const passkey = passkeyInput ? passkeyInput.value.trim() : '';

  if (!passkey) {
    if (errorBox) {
      errorBox.innerText = 'Secret Passkey is required to access Admin Studio.';
      errorBox.style.display = 'block';
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Verifying Passkey...';
    }
    if (errorBox) errorBox.style.display = 'none';

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username || undefined, passkey })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Authentication rejected by security gatekeeper.');
    }

    // Save token with explicit super_admin role
    saveToken(data.token);
    showToast('Master Passkey verified. Welcome to Admin Studio.');

    // Transition to Studio
    const gatekeeperModal = document.getElementById('gatekeeperModal');
    const adminStudioApp = document.getElementById('adminStudioApp');
    if (gatekeeperModal) gatekeeperModal.style.display = 'none';
    if (adminStudioApp) adminStudioApp.style.display = 'block';

    initAdminStudio();

  } catch (err) {
    if (errorBox) {
      errorBox.innerText = err.message;
      errorBox.style.display = 'block';
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Unlock Admin Studio';
    }
  }
}

// Sign out of Admin Studio
function handleAdminSignOut() {
  removeToken();
  showToast('Signed out of Admin Studio.');
  const gatekeeperModal = document.getElementById('gatekeeperModal');
  const adminStudioApp = document.getElementById('adminStudioApp');
  if (gatekeeperModal) gatekeeperModal.style.display = 'flex';
  if (adminStudioApp) adminStudioApp.style.display = 'none';
  const passkeyInput = document.getElementById('gatekeeperPasskey');
  if (passkeyInput) passkeyInput.value = '';
}

// =======================================================
// DASHBOARD: ARTICLE MANAGEMENT & METRICS
// =======================================================

async function loadAdminArticles() {
  const tbody = document.getElementById('adminArticlesTbody');
  if (!tbody) return;

  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center" style="padding: 40px;">Fetching latest publication catalog...</td></tr>`;
    
    const data = await apiRequest('/api/admin/blogs');
    adminArticles = data.blogs || [];

    updateDashboardMetrics();
    renderFilteredArticles();

  } catch (err) {
    console.error('Failed to load admin articles:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center" style="color: var(--danger-color); padding: 30px;">Error loading articles: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function updateDashboardMetrics() {
  const statArticles = document.getElementById('statArticlesCount');
  const statMonetized = document.getElementById('statMonetizedCount');
  const statLikes = document.getElementById('statLikesCount');

  if (statArticles) statArticles.innerText = adminArticles.length;

  const monetizedCount = adminArticles.filter(b => b.affiliate_enabled && b.primary_cta_url && b.primary_cta_url !== '#').length;
  if (statMonetized) statMonetized.innerText = `${monetizedCount} Deals`;

  const totalLikes = adminArticles.reduce((acc, b) => acc + (b.likes_count || 0), 0);
  if (statLikes) statLikes.innerText = totalLikes;
}

function renderFilteredArticles() {
  const tbody = document.getElementById('adminArticlesTbody');
  if (!tbody) return;

  const searchQuery = (document.getElementById('articleSearchInput')?.value || '').toLowerCase().trim();
  const streamFilter = document.getElementById('filterStreamSelect')?.value || 'All';
  const affiliateFilter = document.getElementById('filterAffiliateSelect')?.value || 'All';

  const filtered = adminArticles.filter(blog => {
    // Search filter
    const matchesSearch = !searchQuery || 
      (blog.title && blog.title.toLowerCase().includes(searchQuery)) ||
      (blog.summary && blog.summary.toLowerCase().includes(searchQuery));

    // Stream filter
    const matchesStream = (streamFilter === 'All') || (blog.stream === streamFilter);

    // Affiliate filter
    let matchesAffiliate = true;
    if (affiliateFilter === 'affiliate') {
      matchesAffiliate = !!blog.affiliate_enabled;
    } else if (affiliateFilter === 'standard') {
      matchesAffiliate = !blog.affiliate_enabled;
    }

    return matchesSearch && matchesStream && matchesAffiliate;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-muted text-center" style="padding: 40px;">
          No articles match your search criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(blog => {
    const formattedDate = formatDate(blog.created_at);
    const coverImgSrc = blog.cover_image_path || '';
    const isAffiliate = !!blog.affiliate_enabled;

    const affiliateBadge = isAffiliate ? `
      <span class="admin-badge-affiliate" title="CTA: ${escapeHtml(blog.primary_cta_text || 'Check Price')}">
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
        Affiliate CTA
      </span>
    ` : `
      <span class="admin-badge-standard">Editorial Only</span>
    `;

    const thumbnailHtml = coverImgSrc ? `
      <img src="${coverImgSrc}" class="admin-table-thumb" alt="${escapeHtml(blog.title)}" onerror="handleImageError(this, '${blog.stream}')">
    ` : `
      <div class="fallback-image-card admin-table-thumb" style="min-height: 52px; font-size: 9px;">
        <span>${escapeHtml(blog.stream.substring(0, 3)).toUpperCase()}</span>
      </div>
    `;

    return `
      <tr>
        <td>${thumbnailHtml}</td>
        <td>
          <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: var(--text-primary);">
            ${escapeHtml(blog.title)}
          </div>
          <div class="text-muted" style="font-size: 12px; max-width: 480px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHtml(blog.summary || 'No summary description provided.')}
          </div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
            By ${escapeHtml(blog.author_name || 'Super Admin')} • ${escapeHtml(blog.estimated_read_time || '5 min read')} • ❤️ ${blog.likes_count || 0}
          </div>
        </td>
        <td>
          <span class="badge">${escapeHtml(blog.stream)}</span>
        </td>
        <td style="font-size: 13px; color: var(--text-secondary);">
          ${formattedDate}
        </td>
        <td>
          ${affiliateBadge}
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <a href="blog.html?id=${blog.id}" target="_blank" class="action-btn-sm" title="Preview Live Post" style="text-decoration:none;">
            👁️ Preview
          </a>
          <button onclick="editBlogInStudio(${blog.id})" class="action-btn-sm" style="color: #2563eb; border-color: #2563eb;">
            ✏️ Edit
          </button>
          <button onclick="promptDeleteArticle(${blog.id}, '${escapeHtml(blog.title.replace(/'/g, "\\'"))}')" class="action-btn-sm action-btn-danger">
            🗑️ Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// =======================================================
// ARTICLE DELETION WITH CONFIRMATION MODAL
// =======================================================

function promptDeleteArticle(id, title) {
  pendingDeleteBlogId = id;
  const modal = document.getElementById('deleteConfirmModal');
  const targetTitle = document.getElementById('deleteTargetTitle');
  if (targetTitle) targetTitle.innerText = `"${title}" (#${id})`;
  if (modal) modal.style.display = 'flex';
}

function closeDeleteModal() {
  pendingDeleteBlogId = null;
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) modal.style.display = 'none';
}

async function confirmDeleteArticle() {
  if (!pendingDeleteBlogId) return;

  const btnConfirm = document.getElementById('btnConfirmDelete');
  try {
    if (btnConfirm) {
      btnConfirm.disabled = true;
      btnConfirm.innerText = 'Deleting...';
    }

    await apiRequest(`/api/admin/blogs/${pendingDeleteBlogId}`, { method: 'DELETE' });
    showToast(`Article #${pendingDeleteBlogId} permanently removed.`);
    closeDeleteModal();
    loadAdminArticles();

  } catch (err) {
    console.error('Delete article failed:', err);
    showToast('Failed to delete: ' + err.message, 'error');
  } finally {
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.innerText = 'Confirm Delete';
    }
  }
}

// =======================================================
// BLOG STUDIO EDITOR (CREATE & EDIT)
// =======================================================

function switchTab(tab) {
  const tabArticlesBtn = document.getElementById('tabArticlesBtn');
  const tabEditorBtn = document.getElementById('tabEditorBtn');
  const viewDashboard = document.getElementById('viewArticlesDashboard');
  const viewEditor = document.getElementById('viewBlogEditor');

  if (tab === 'articles') {
    tabArticlesBtn?.classList.add('active');
    tabEditorBtn?.classList.remove('active');
    if (viewDashboard) viewDashboard.style.display = 'block';
    if (viewEditor) viewEditor.style.display = 'none';
  } else {
    tabEditorBtn?.classList.add('active');
    tabArticlesBtn?.classList.remove('active');
    if (viewDashboard) viewDashboard.style.display = 'none';
    if (viewEditor) viewEditor.style.display = 'block';
    updateLivePreview();
  }
}

function resetEditorForNewPost() {
  document.getElementById('editArticleId').value = '';
  document.getElementById('editorModeBadge').innerText = 'Creating New Article';
  document.getElementById('editorHeadingText').innerText = 'Editorial Publishing Canvas';
  document.getElementById('btnSaveArticle').innerText = 'Publish Article';

  document.getElementById('formTitle').value = '';
  document.getElementById('formSummary').value = '';
  document.getElementById('formStream').value = 'Technology';
  document.getElementById('formAuthor').value = 'Super Admin';
  document.getElementById('formReadTime').value = '8 min read';

  document.getElementById('mediaSourceFile').checked = true;
  toggleMediaSource('file');
  selectedCoverFile = null;
  document.getElementById('formCoverFile').value = '';
  document.getElementById('formCoverUrl').value = '';
  
  updateCoverPreview('');

  document.getElementById('formAffiliateToggle').checked = true;
  toggleAffiliateFields(true);
  document.getElementById('formCtaText').value = 'Check Latest Price on Amazon';
  document.getElementById('formCtaUrl').value = '';

  currentPros = [
    'Uncompromising flagship performance sustained across heavy workloads',
    'Class-leading industrial design, ergonomic tactile keyboard, and premium materials'
  ];
  currentCons = [
    'Premium price point reflecting high-performance tier'
  ];
  renderProsList();
  renderConsList();

  document.getElementById('formContent').value = `> "Lead with a compelling editorial blockquote highlighting the core thesis of your technical breakdown or market analysis."

## Deep Architectural Breakdown

Provide structured analysis, architectural schematics, or benchmark data here.

* Key specification milestone 1
* Key specification milestone 2
* Key specification milestone 3

## Comparative Analysis & Real-World Metrics

| Model Feature | Flagship Tier | Standard Alternative |
| --- | --- | --- |
| **Silicon Architecture** | 3nm Next-Gen Node | 5nm Prior Gen |
| **Sustained Throughput** | 175W Peak Thermal Envelope | 120W Baseline |
| **MSRP / Commercial Tier** | $2,499.00 | $1,699.00 |

## Final Verdict & Recommendation

Deliver clear, authoritative purchasing guidance for enterprise leaders or consumers.`;

  updateLivePreview();
  switchTab('editor');
}

async function editBlogInStudio(blogId) {
  try {
    const data = await apiRequest(`/api/admin/blogs/${blogId}`);
    const blog = data.blog;
    if (!blog) throw new Error('Article not found.');

    document.getElementById('editArticleId').value = blog.id;
    document.getElementById('editorModeBadge').innerText = `Editing Article #${blog.id}`;
    document.getElementById('editorHeadingText').innerText = `Editing: ${blog.title}`;
    document.getElementById('btnSaveArticle').innerText = 'Update Article';

    document.getElementById('formTitle').value = blog.title || '';
    document.getElementById('formSummary').value = blog.summary || '';
    document.getElementById('formStream').value = blog.stream || 'Technology';
    document.getElementById('formAuthor').value = blog.author_name || 'Super Admin';
    document.getElementById('formReadTime').value = blog.estimated_read_time || '8 min read';

    // Media Cover Image
    selectedCoverFile = null;
    document.getElementById('formCoverFile').value = '';
    if (blog.cover_image_path && blog.cover_image_path.startsWith('http')) {
      document.getElementById('mediaSourceUrl').checked = true;
      toggleMediaSource('url');
      document.getElementById('formCoverUrl').value = blog.cover_image_path;
    } else {
      document.getElementById('mediaSourceFile').checked = true;
      toggleMediaSource('file');
      document.getElementById('formCoverUrl').value = '';
    }
    updateCoverPreview(blog.cover_image_path || '');

    // Affiliate
    const isAffiliate = !!blog.affiliate_enabled;
    document.getElementById('formAffiliateToggle').checked = isAffiliate;
    toggleAffiliateFields(isAffiliate);
    document.getElementById('formCtaText').value = blog.primary_cta_text || 'Check Latest Price';
    document.getElementById('formCtaUrl').value = blog.primary_cta_url && blog.primary_cta_url !== '#' ? blog.primary_cta_url : '';

    // Pros and Cons
    try {
      currentPros = typeof blog.pros_json === 'string' ? JSON.parse(blog.pros_json) : (blog.pros_json || []);
    } catch (e) { currentPros = []; }
    try {
      currentCons = typeof blog.cons_json === 'string' ? JSON.parse(blog.cons_json) : (blog.cons_json || []);
    } catch (e) { currentCons = []; }

    renderProsList();
    renderConsList();

    // Content body
    document.getElementById('formContent').value = blog.content || '';

    updateLivePreview();
    switchTab('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    console.error('Failed to load article for editing:', err);
    showToast('Failed to load article: ' + err.message, 'error');
  }
}

// Media source switcher (file vs url)
function toggleMediaSource(source) {
  const fileContainer = document.getElementById('fileUploadContainer');
  const urlContainer = document.getElementById('urlUploadContainer');
  if (source === 'file') {
    if (fileContainer) fileContainer.style.display = 'block';
    if (urlContainer) urlContainer.style.display = 'none';
  } else {
    if (fileContainer) fileContainer.style.display = 'none';
    if (urlContainer) urlContainer.style.display = 'block';
  }
}

function updateCoverPreview(imgSrc) {
  const previewImg = document.getElementById('coverPreviewImg');
  const fallbackCard = document.getElementById('coverFallbackCard');
  const fallbackText = document.getElementById('coverFallbackStreamText');
  const stream = document.getElementById('formStream')?.value || 'TECHNOLOGY';

  if (fallbackText) fallbackText.innerText = stream.toUpperCase();

  if (imgSrc) {
    if (previewImg) {
      previewImg.src = imgSrc;
      previewImg.style.display = 'block';
    }
    if (fallbackCard) fallbackCard.style.display = 'none';
  } else {
    if (previewImg) {
      previewImg.src = '';
      previewImg.style.display = 'none';
    }
    if (fallbackCard) fallbackCard.style.display = 'flex';
  }

  // Also update live preview image
  const livePreviewImg = document.getElementById('previewCoverImg');
  if (livePreviewImg) {
    if (imgSrc) {
      livePreviewImg.src = imgSrc;
      livePreviewImg.style.display = 'block';
    } else {
      livePreviewImg.style.display = 'none';
    }
  }
}

function toggleAffiliateFields(enabled) {
  const area = document.getElementById('affiliateFieldsArea');
  if (area) {
    area.style.display = enabled ? 'grid' : 'none';
  }
}

// =======================================================
// STRUCTURED PROS & CONS MANAGEMENT
// =======================================================

function renderProsList() {
  const container = document.getElementById('prosListContainer');
  if (!container) return;

  if (currentPros.length === 0) {
    container.innerHTML = `<div class="text-muted" style="font-size: 12px; font-style: italic; padding: 6px 0;">No advantages added yet.</div>`;
    return;
  }

  container.innerHTML = currentPros.map((pro, index) => `
    <div class="builder-item-tag">
      <span><strong style="color:#10b981; margin-right:4px;">✓</strong> ${escapeHtml(pro)}</span>
      <button type="button" onclick="removeProItem(${index})" title="Remove item">×</button>
    </div>
  `).join('');

  updateLivePreview();
}

function renderConsList() {
  const container = document.getElementById('consListContainer');
  if (!container) return;

  if (currentCons.length === 0) {
    container.innerHTML = `<div class="text-muted" style="font-size: 12px; font-style: italic; padding: 6px 0;">No considerations added yet.</div>`;
    return;
  }

  container.innerHTML = currentCons.map((con, index) => `
    <div class="builder-item-tag">
      <span><strong style="color:#ef4444; margin-right:4px;">✕</strong> ${escapeHtml(con)}</span>
      <button type="button" onclick="removeConItem(${index})" title="Remove item">×</button>
    </div>
  `).join('');

  updateLivePreview();
}

function addProItem() {
  const input = document.getElementById('proInput');
  const val = input ? input.value.trim() : '';
  if (!val) return;
  currentPros.push(val);
  input.value = '';
  renderProsList();
}

function addConItem() {
  const input = document.getElementById('conInput');
  const val = input ? input.value.trim() : '';
  if (!val) return;
  currentCons.push(val);
  input.value = '';
  renderConsList();
}

function removeProItem(index) {
  currentPros.splice(index, 1);
  renderProsList();
}

function removeConItem(index) {
  currentCons.splice(index, 1);
  renderConsList();
}

// =======================================================
// LIVE SPLIT-VIEW PREVIEW ENGINE
// =======================================================

function updateLivePreview() {
  const title = document.getElementById('formTitle')?.value || 'Article Title Preview';
  const summary = document.getElementById('formSummary')?.value || '';
  const stream = document.getElementById('formStream')?.value || 'Technology';
  const readTime = document.getElementById('formReadTime')?.value || '5 min read';
  const content = document.getElementById('formContent')?.value || '';
  const isAffiliate = document.getElementById('formAffiliateToggle')?.checked;
  const ctaText = document.getElementById('formCtaText')?.value || 'Check Latest Price';
  const ctaUrl = document.getElementById('formCtaUrl')?.value || '#';

  const previewBadge = document.getElementById('previewBadge');
  const previewReadTime = document.getElementById('previewReadTime');
  const previewTitle = document.getElementById('previewTitle');
  const previewSummary = document.getElementById('previewSummary');
  const previewBody = document.getElementById('previewBody');
  const previewProsCons = document.getElementById('previewProsConsContainer');
  const previewCta = document.getElementById('previewCtaContainer');

  if (previewBadge) previewBadge.innerText = stream;
  if (previewReadTime) previewReadTime.innerText = `• ${readTime}`;
  if (previewTitle) previewTitle.innerText = title;
  if (previewSummary) previewSummary.innerText = summary;

  if (previewBody) {
    previewBody.innerHTML = parseMarkdown(content);
  }

  // Live Pros & Cons
  if (previewProsCons) {
    if (currentPros.length > 0 || currentCons.length > 0) {
      const prosHtml = currentPros.map(p => `<li>${escapeHtml(p)}</li>`).join('');
      const consHtml = currentCons.map(c => `<li>${escapeHtml(c)}</li>`).join('');
      previewProsCons.innerHTML = `
        <div class="pros-cons-grid" style="margin-top: 24px;">
          <div class="pro-card">
            <h5>✓ Key Advantages</h5>
            <ul>${prosHtml}</ul>
          </div>
          <div class="con-card">
            <h5>✕ Key Considerations</h5>
            <ul>${consHtml}</ul>
          </div>
        </div>
      `;
    } else {
      previewProsCons.innerHTML = '';
    }
  }

  // Live CTA Box
  if (previewCta) {
    if (isAffiliate && ctaText && ctaUrl && ctaUrl !== '#') {
      previewCta.innerHTML = `
        <div class="affiliate-cta-box" style="margin-top: 32px;">
          <div class="cta-header">
            <div>
              <div class="cta-title">Featured Deal: ${escapeHtml(title)}</div>
              <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">Verified Partner Stock</p>
            </div>
            <span class="cta-price-tag">Top Value</span>
          </div>
          <a href="${escapeHtml(ctaUrl)}" target="_blank" rel="nofollow sponsored" class="cta-button">
            <span>${escapeHtml(ctaText)}</span>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
        </div>
      `;
    } else {
      previewCta.innerHTML = '';
    }
  }
}

// Layout mode switcher in Editor
function setEditorViewMode(mode) {
  const writePane = document.getElementById('adminWritePane');
  const previewPane = document.getElementById('adminPreviewPane');
  const layout = document.getElementById('adminEditorLayout');
  const btnEdit = document.getElementById('btnViewEdit');
  const btnSplit = document.getElementById('btnViewSplit');
  const btnPreview = document.getElementById('btnViewPreview');

  btnEdit?.classList.remove('active');
  btnSplit?.classList.remove('active');
  btnPreview?.classList.remove('active');

  if (mode === 'edit') {
    btnEdit?.classList.add('active');
    if (layout) layout.style.gridTemplateColumns = '1fr';
    if (writePane) writePane.style.display = 'block';
    if (previewPane) previewPane.style.display = 'none';
  } else if (mode === 'preview') {
    btnPreview?.classList.add('active');
    if (layout) layout.style.gridTemplateColumns = '1fr';
    if (writePane) writePane.style.display = 'none';
    if (previewPane) previewPane.style.display = 'block';
  } else {
    btnSplit?.classList.add('active');
    if (layout) layout.style.gridTemplateColumns = '1fr 1fr';
    if (writePane) writePane.style.display = 'block';
    if (previewPane) previewPane.style.display = 'block';
  }
}

// =======================================================
// ARTICLE SAVE / PUBLISH ACTIONS
// =======================================================

async function saveArticleFromStudio() {
  const editId = document.getElementById('editArticleId')?.value;
  const title = document.getElementById('formTitle')?.value.trim();
  const summary = document.getElementById('formSummary')?.value.trim();
  const stream = document.getElementById('formStream')?.value;
  const authorName = document.getElementById('formAuthor')?.value.trim() || 'Super Admin';
  const readTime = document.getElementById('formReadTime')?.value.trim() || '8 min read';
  const content = document.getElementById('formContent')?.value.trim();
  const affiliateEnabled = document.getElementById('formAffiliateToggle')?.checked ? 1 : 0;
  const ctaText = document.getElementById('formCtaText')?.value.trim();
  const ctaUrl = document.getElementById('formCtaUrl')?.value.trim();
  const mediaSource = document.querySelector('input[name="mediaSource"]:checked')?.value || 'file';
  const coverUrl = document.getElementById('formCoverUrl')?.value.trim();

  if (!title) {
    showToast('Article title is required.', 'error');
    document.getElementById('formTitle')?.focus();
    return;
  }
  if (!content) {
    showToast('Article content body is required.', 'error');
    document.getElementById('formContent')?.focus();
    return;
  }

  const saveBtn = document.getElementById('btnSaveArticle');
  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerText = editId ? 'Updating...' : 'Publishing...';
    }

    const prosJson = JSON.stringify(currentPros);
    const consJson = JSON.stringify(currentCons);

    let resData;

    if (selectedCoverFile) {
      // Use FormData for file upload
      const formData = new FormData();
      formData.append('title', title);
      formData.append('summary', summary);
      formData.append('stream', stream);
      formData.append('author_name', authorName);
      formData.append('estimated_read_time', readTime);
      formData.append('content', content);
      formData.append('affiliate_enabled', affiliateEnabled);
      formData.append('primary_cta_text', ctaText);
      formData.append('primary_cta_url', ctaUrl);
      formData.append('pros_json', prosJson);
      formData.append('cons_json', consJson);
      formData.append('cover_image', selectedCoverFile);

      const endpoint = editId ? `/api/admin/blogs/${editId}` : '/api/admin/blogs';
      const method = editId ? 'PUT' : 'POST';

      resData = await apiRequest(endpoint, {
        method,
        body: formData
      });
    } else {
      // JSON body
      const endpoint = editId ? `/api/admin/blogs/${editId}` : '/api/admin/blogs';
      const method = editId ? 'PUT' : 'POST';

      resData = await apiRequest(endpoint, {
        method,
        body: {
          title,
          summary,
          stream,
          author_name: authorName,
          estimated_read_time: readTime,
          content,
          affiliate_enabled: affiliateEnabled,
          primary_cta_text: ctaText,
          primary_cta_url: ctaUrl,
          pros_json: prosJson,
          cons_json: consJson,
          cover_image_url: mediaSource === 'url' ? coverUrl : undefined
        }
      });
    }

    showToast(editId ? 'Article updated successfully.' : 'Article published successfully.');
    switchTab('articles');
    loadAdminArticles();

  } catch (err) {
    console.error('Save article error:', err);
    showToast('Failed to save article: ' + err.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerText = editId ? 'Update Article' : 'Publish Article';
    }
  }
}

// Formatting helpers
function insertAdminMD(prefix, suffix) {
  const textarea = document.getElementById('formContent');
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end) || 'Text';
  textarea.value = textarea.value.substring(0, start) + prefix + selected + suffix + textarea.value.substring(end);
  textarea.focus();
  textarea.selectionStart = start + prefix.length;
  textarea.selectionEnd = start + prefix.length + selected.length;
  updateLivePreview();
}

function insertAdminLink() {
  const url = prompt('Enter destination link URL:', 'https://');
  if (!url) return;
  const label = prompt('Enter link label text:', 'Read full report') || 'link';
  insertAdminMD(`[${label}](`, `${url})`);
}

function insertAdminTable() {
  const tableTemplate = `
| Specification Feature | Benchmark Flagship | Baseline Comparison |
| --- | --- | --- |
| **Compute Metric** | 3.4 TFLOPS | 1.8 TFLOPS |
| **Memory Bandwidth** | 128 GB/s | 64 GB/s |
| **Operational Efficiency** | 94% Rating | 82% Rating |
`;
  insertAdminMD(tableTemplate, '');
}

function insertAdminCtaBox() {
  const shortcode = `\n[CTA_BOX title="Featured Product Model" price="$1,299.99" specs="Key Spec 1, Key Spec 2, 2-Year Warranty" link="https://amzn.to/example" button="Check Latest Price on Amazon"]\n`;
  insertAdminMD(shortcode, '');
}

// =======================================================
// INITIALIZATION & EVENT ATTACHMENTS
// =======================================================

function initAdminStudio() {
  loadAdminArticles();

  // Tab switching
  document.getElementById('tabArticlesBtn')?.addEventListener('click', () => switchTab('articles'));
  document.getElementById('tabEditorBtn')?.addEventListener('click', () => switchTab('editor'));
  document.getElementById('btnHeaderNewPost')?.addEventListener('click', resetEditorForNewPost);
  document.getElementById('btnCancelEditor')?.addEventListener('click', () => switchTab('articles'));

  // Save action
  document.getElementById('btnSaveArticle')?.addEventListener('click', saveArticleFromStudio);

  // Search & filter listeners
  document.getElementById('articleSearchInput')?.addEventListener('input', renderFilteredArticles);
  document.getElementById('filterStreamSelect')?.addEventListener('change', renderFilteredArticles);
  document.getElementById('filterAffiliateSelect')?.addEventListener('change', renderFilteredArticles);

  // Delete modal listeners
  document.getElementById('btnCancelDelete')?.addEventListener('click', closeDeleteModal);
  document.getElementById('btnConfirmDelete')?.addEventListener('click', confirmDeleteArticle);

  // Media source radio toggles
  document.querySelectorAll('input[name="mediaSource"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      toggleMediaSource(e.target.value);
    });
  });

  // Local file input listener
  const filePanel = document.getElementById('adminUploadPanel');
  const fileInput = document.getElementById('formCoverFile');
  if (filePanel && fileInput) {
    filePanel.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedCoverFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
          updateCoverPreview(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    });

    // Drag and drop
    filePanel.addEventListener('dragover', (e) => {
      e.preventDefault();
      filePanel.style.borderColor = '#2563eb';
    });
    filePanel.addEventListener('dragleave', () => {
      filePanel.style.borderColor = 'var(--border-color)';
    });
    filePanel.addEventListener('drop', (e) => {
      e.preventDefault();
      filePanel.style.borderColor = 'var(--border-color)';
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        selectedCoverFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
          updateCoverPreview(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // External URL input listener
  document.getElementById('formCoverUrl')?.addEventListener('input', (e) => {
    updateCoverPreview(e.target.value.trim());
  });

  // Stream selector listener
  document.getElementById('formStream')?.addEventListener('change', () => {
    updateCoverPreview(document.getElementById('coverPreviewImg')?.src || '');
    updateLivePreview();
  });

  // Affiliate toggle listener
  document.getElementById('formAffiliateToggle')?.addEventListener('change', (e) => {
    toggleAffiliateFields(e.target.checked);
    updateLivePreview();
  });

  // Live preview input bindings
  ['formTitle', 'formSummary', 'formReadTime', 'formContent', 'formCtaText', 'formCtaUrl'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateLivePreview);
  });

  // Pros & Cons builder buttons
  document.getElementById('btnAddPro')?.addEventListener('click', addProItem);
  document.getElementById('btnAddCon')?.addEventListener('click', addConItem);
  document.getElementById('proInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addProItem();
    }
  });
  document.getElementById('conInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addConItem();
    }
  });

  // Editor View layout buttons
  document.getElementById('btnViewEdit')?.addEventListener('click', () => setEditorViewMode('edit'));
  document.getElementById('btnViewSplit')?.addEventListener('click', () => setEditorViewMode('split'));
  document.getElementById('btnViewPreview')?.addEventListener('click', () => setEditorViewMode('preview'));

  // Theme toggle
  document.getElementById('adminThemeToggle')?.addEventListener('click', toggleTheme);

  // Sign out
  document.getElementById('adminSignOutBtn')?.addEventListener('click', handleAdminSignOut);

  // Check URL params for edit=ID
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit');
  if (editId) {
    editBlogInStudio(editId);
  } else if (window.location.hash === '#editor') {
    resetEditorForNewPost();
  }
}

// Window Load Handler
window.addEventListener('DOMContentLoaded', async () => {
  // Gatekeeper Form
  document.getElementById('gatekeeperForm')?.addEventListener('submit', handleGatekeeperLogin);

  // Verify session
  const isAuth = await verifyAdminSession();
  if (isAuth) {
    initAdminStudio();
  }
});
