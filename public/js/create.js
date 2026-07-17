// Protect page route: redirect if not logged in
const user = getUser();
if (!user) {
  showToast('You must sign in to create a story.', 'error');
  setTimeout(() => {
    window.location.href = 'auth.html';
  }, 1000);
}

let selectedFile = null;

// Drag and drop setup
const uploadPanel = document.getElementById('uploadPanel');
const coverFileInput = document.getElementById('coverFileInput');
const coverPreviewImg = document.getElementById('coverPreviewImg');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');

if (uploadPanel) {
  uploadPanel.addEventListener('click', () => {
    coverFileInput.click();
  });

  coverFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  uploadPanel.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadPanel.classList.add('dragover');
  });

  uploadPanel.addEventListener('dragleave', () => {
    uploadPanel.classList.remove('dragover');
  });

  uploadPanel.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadPanel.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
}

function handleFile(file) {
  if (!file.type.match('image.*')) {
    showToast('Please select an image file (jpg, png, webp).', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image size exceeds 5MB limit.', 'error');
    return;
  }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    coverPreviewImg.src = e.target.result;
    coverPreviewImg.style.display = 'block';
    uploadPlaceholder.style.display = 'none';
    
    // Refresh preview if active
    updateLivePreview();
  };
  reader.readAsDataURL(file);
}

// Markdown formatting helper
function insertMarkdown(before, after = '') {
  const textarea = document.getElementById('editorContent');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);
  const replacement = before + selected + after;

  textarea.value = text.substring(0, start) + replacement + text.substring(end);
  
  // Set cursor position back
  textarea.focus();
  textarea.selectionStart = start + before.length;
  textarea.selectionEnd = start + before.length + selected.length;
  
  updateLivePreview();
}

function insertLinkMD() {
  const label = prompt('Enter link label text:');
  const url = prompt('Enter link URL (e.g., https://example.com):');
  if (label && url) {
    insertMarkdown(`[${label}](${url})`, '');
  }
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

// Live preview function
function updateLivePreview() {
  const title = document.getElementById('editorTitle').value.trim();
  const content = document.getElementById('editorContent').value;
  const stream = document.getElementById('streamSelect').value;

  document.getElementById('previewTitle').innerText = title || 'Untitled Story';
  document.getElementById('previewStreamBadge').innerText = stream;

  const previewCover = document.getElementById('previewCoverImg');
  if (selectedFile) {
    previewCover.src = coverPreviewImg.src;
    previewCover.style.display = 'block';
  } else {
    previewCover.style.display = 'none';
  }

  const parsedBody = parseMarkdown(content);
  document.getElementById('previewBodyContent').innerHTML = parsedBody || '<p class="text-muted">No content written yet...</p>';
}

// Tab handlers
const editTabBtn = document.getElementById('editTabBtn');
const splitTabBtn = document.getElementById('splitTabBtn');
const previewTabBtn = document.getElementById('previewTabBtn');

const creatorLayout = document.getElementById('creatorLayout');
const editorPane = document.getElementById('editorPane');
const previewPane = document.getElementById('previewPane');

function selectTab(mode) {
  // Remove active state
  [editTabBtn, splitTabBtn, previewTabBtn].forEach(btn => btn.classList.remove('active'));

  if (mode === 'edit') {
    editTabBtn.classList.add('active');
    creatorLayout.classList.remove('split-view');
    editorPane.style.display = 'block';
    previewPane.style.display = 'none';
  } else if (mode === 'split') {
    splitTabBtn.classList.add('active');
    creatorLayout.classList.add('split-view');
    editorPane.style.display = 'block';
    previewPane.style.display = 'block';
    updateLivePreview();
  } else if (mode === 'preview') {
    previewTabBtn.classList.add('active');
    creatorLayout.classList.remove('split-view');
    editorPane.style.display = 'none';
    previewPane.style.display = 'block';
    updateLivePreview();
  }
}

if (editTabBtn && splitTabBtn && previewTabBtn) {
  editTabBtn.addEventListener('click', () => selectTab('edit'));
  splitTabBtn.addEventListener('click', () => selectTab('split'));
  previewTabBtn.addEventListener('click', () => selectTab('preview'));
}

// Bind live events on input
const editorTitle = document.getElementById('editorTitle');
const editorContent = document.getElementById('editorContent');
const streamSelect = document.getElementById('streamSelect');

if (editorTitle && editorContent && streamSelect) {
  editorTitle.addEventListener('input', updateLivePreview);
  editorContent.addEventListener('input', updateLivePreview);
  streamSelect.addEventListener('change', updateLivePreview);
}

// Submit publish request
const publishBtn = document.getElementById('publishBtn');
if (publishBtn) {
  publishBtn.addEventListener('click', async () => {
    const title = document.getElementById('editorTitle').value.trim();
    const content = document.getElementById('editorContent').value.trim();
    const stream = document.getElementById('streamSelect').value;

    if (!title) {
      showToast('Please enter a title for your story.', 'error');
      return;
    }

    if (!content) {
      showToast('Please write some content before publishing.', 'error');
      return;
    }

    publishBtn.disabled = true;
    publishBtn.innerText = 'Publishing...';

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('stream', stream);
      if (selectedFile) {
        formData.append('cover_image', selectedFile);
      }

      const data = await apiRequest('/api/blogs', {
        method: 'POST',
        body: formData
      });

      showToast('Story published successfully!');
      setTimeout(() => {
        window.location.href = `blog.html?id=${data.blogId}`;
      }, 1500);

    } catch (err) {
      console.error('Publish error:', err);
      showToast(err.message, 'error');
      publishBtn.disabled = false;
      publishBtn.innerText = 'Publish';
    }
  });
}
