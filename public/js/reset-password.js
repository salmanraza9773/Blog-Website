function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

const token = getQueryParam('token');
const resetForm = document.getElementById('resetForm');

if (!token) {
  showToast('Invalid or missing password reset token.', 'error');
  setTimeout(() => {
    window.location.href = 'auth.html';
  }, 2000);
}

if (resetForm) {
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    const btn = resetForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = 'Updating Password...';

    try {
      const data = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword }
      });

      showToast(data.message || 'Password reset successful!');
      
      setTimeout(() => {
        window.location.href = 'auth.html';
      }, 1500);

    } catch (err) {
      console.error('Reset password error:', err);
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerText = 'Update Password';
    }
  });
}
