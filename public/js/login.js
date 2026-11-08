// Gửi tài khoản và mật khẩu lên API. Nếu đúng thì lưu token và chuyển sang trang tổng quan.
(function () {
  const form = document.getElementById('login-form');
  const error = document.getElementById('login-error');

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    error.hidden = true;

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showError('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      });

      const data = await response.json().catch(function () { return {}; });

      if (!response.ok) {
        showError(data.message || 'Đăng nhập thất bại.');
        return;
      }

      window.Session.save(data.token, data.user);
      window.location.href = 'dashboard.html';
    } catch (err) {
      showError('Không kết nối được máy chủ.');
    }
  });
})();
