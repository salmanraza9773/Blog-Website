// Check admin access
const currentUser = getUser();
if (!currentUser || currentUser.role !== 'admin') {
  showToast('Access Denied. Administrator rights required.', 'error');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1500);
}

async function loadAdminData() {
  await Promise.all([loadAdminBlogs(), loadAdminUsers()]);
}

async function loadAdminBlogs() {
  const tbody = document.getElementById('adminBlogsTbody');
  const statBlogs = document.getElementById('statTotalBlogs');
  if (!tbody) return;

  try {
    const data = await apiRequest('/api/blogs');
    const blogs = data.blogs || [];

    if (statBlogs) statBlogs.innerText = blogs.length;

    if (blogs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-muted text-center">No articles found.</td></tr>`;
      return;
    }

    tbody.innerHTML = blogs.map(blog => `
      <tr>
        <td><strong>#${blog.id}</strong></td>
        <td>
          <a href="blog.html?id=${blog.id}" target="_blank" style="font-weight: 600; text-decoration: underline;">
            ${blog.title}
          </a>
        </td>
        <td><span class="badge">${blog.stream}</span></td>
        <td>@${blog.author_name}</td>
        <td>❤️ ${blog.likes_count}</td>
        <td>${blog.estimated_read_time || 'N/A'}</td>
        <td>
          <a href="create.html?edit=${blog.id}" class="action-btn-sm">Edit</a>
          <button onclick="deleteBlogAsAdmin(${blog.id})" class="action-btn-sm action-btn-danger">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading admin blogs:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted text-center" style="color: var(--danger-color);">${err.message}</td></tr>`;
  }
}

async function loadAdminUsers() {
  const tbody = document.getElementById('adminUsersTbody');
  const statUsers = document.getElementById('statTotalUsers');
  if (!tbody) return;

  try {
    const data = await apiRequest('/api/users/all');
    const users = data.users || [];

    if (statUsers) statUsers.innerText = users.length;

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center">No users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => {
      const isSelf = currentUser && currentUser.id === u.id;
      const deleteBtn = isSelf ? 
        `<span class="text-muted" style="font-size:12px;">(Active Account)</span>` : 
        `<button onclick="deleteUserAsAdmin(${u.id}, '${u.username}')" class="action-btn-sm action-btn-danger">Delete User</button>`;

      return `
        <tr>
          <td><strong>#${u.id}</strong></td>
          <td>@${u.username}</td>
          <td>${u.email}</td>
          <td><span class="role-badge ${u.role === 'admin' ? 'admin' : 'user'}">${u.role}</span></td>
          <td>${u.blog_count} posts</td>
          <td>${deleteBtn}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading admin users:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center" style="color: var(--danger-color);">${err.message}</td></tr>`;
  }
}

async function deleteBlogAsAdmin(blogId) {
  if (!confirm(`Are you sure you want to delete article #${blogId}? This action cannot be undone.`)) {
    return;
  }

  try {
    await apiRequest(`/api/blogs/${blogId}`, { method: 'DELETE' });
    showToast(`Article #${blogId} deleted successfully.`);
    loadAdminBlogs();
  } catch (err) {
    console.error('Delete blog error:', err);
    showToast(err.message, 'error');
  }
}

async function deleteUserAsAdmin(userId, username) {
  if (!confirm(`Are you sure you want to delete user @${username} (ID: ${userId}) and all their published content?`)) {
    return;
  }

  try {
    await apiRequest(`/api/users/${userId}`, { method: 'DELETE' });
    showToast(`User @${username} deleted successfully.`);
    loadAdminData();
  } catch (err) {
    console.error('Delete user error:', err);
    showToast(err.message, 'error');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadAdminData();
});
