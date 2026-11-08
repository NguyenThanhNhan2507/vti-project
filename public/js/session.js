// Quản lý phiên đăng nhập (token + thông tin người dùng) và hàm gọi API có kèm token.
(function () {
  const TOKEN_KEY = 'authToken';
  const USER_KEY = 'currentUser';

  const Session = {
    getToken: function () {
      return sessionStorage.getItem(TOKEN_KEY);
    },
    getUser: function () {
      try {
        const raw = sessionStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        return null;
      }
    },
    save: function (token, user) {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    clear: function () {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
  };

  // Gọi API và tự gắn token. Nếu token hết hạn (401) thì quay về trang đăng nhập.
  async function apiFetch(path, options) {
    const opts = options || {};
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    const token = Session.getToken();
    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }

    const response = await fetch(path, Object.assign({}, opts, { headers: headers }));
    const data = await response.json().catch(function () { return {}; });

    if (response.status === 401) {
      Session.clear();
      window.location.href = 'login.html';
      throw new Error(data.message || 'Phiên đăng nhập đã hết hạn');
    }
    if (!response.ok) {
      throw new Error(data.message || 'Có lỗi xảy ra');
    }
    return data;
  }

  window.Session = Session;
  window.api = apiFetch;
})();
