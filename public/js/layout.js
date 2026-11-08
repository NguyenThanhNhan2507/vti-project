// Dựng thanh bên theo vai trò, khối người dùng góc trên bên phải, và chặn trang không đủ quyền.
// Mỗi trang cần có <aside id="sidebar">, <div id="current-user"> và thuộc tính data-roles trên <body> (nếu giới hạn quyền).
(function () {
  const NAV_ITEMS = [
    { label: 'Tổng quan', href: 'dashboard.html', roles: ['admin', 'manager', 'sales'] },
    { label: 'Khách hàng', href: 'customers.html', roles: ['admin', 'manager', 'sales'] },
    { label: 'Cơ hội bán hàng', href: null, roles: ['admin', 'manager', 'sales'] },
    { label: 'Người dùng', href: 'users.html', roles: ['admin'] },
    { label: 'Nhật ký hoạt động', href: null, roles: ['admin'] }
  ];

  const ROLE_LABELS = {
    admin: 'Quản trị viên',
    manager: 'Quản lý',
    sales: 'Nhân viên kinh doanh'
  };

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderSidebar(user, currentPage) {
    const aside = document.getElementById('sidebar');
    if (!aside) return;

    const links = NAV_ITEMS
      .filter(function (item) { return item.roles.indexOf(user.role) !== -1; })
      .map(function (item) {
        if (!item.href) {
          return '<span class="nav-disabled">' + esc(item.label) + '</span>';
        }
        const active = item.href === currentPage ? ' active' : '';
        return '<a href="' + item.href + '" class="' + active.trim() + '">' + esc(item.label) + '</a>';
      })
      .join('');

    aside.innerHTML = '<div class="brand">CRM VTI</div><nav>' + links + '</nav>';
  }

  function renderUserBox(user) {
    const el = document.getElementById('current-user');
    if (!el) return;

    const name = user.fullName || user.username;
    const words = name.trim().split(/\s+/);
    const initial = words[words.length - 1].charAt(0).toUpperCase();

    el.innerHTML =
      '<div class="user-box">' +
        '<span class="avatar">' + esc(initial) + '</span>' +
        '<div class="user-info">' +
          '<strong>' + esc(name) + '</strong>' +
          '<small>' + esc(ROLE_LABELS[user.role] || user.role) + '</small>' +
        '</div>' +
        '<button type="button" id="logout-btn" class="btn btn-ghost">Đăng xuất</button>' +
      '</div>';

    document.getElementById('logout-btn').addEventListener('click', function () {
      window.Session.clear();
      window.location.href = 'login.html';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    const user = window.Session.getUser();
    if (!user || !window.Session.getToken()) {
      window.location.href = 'login.html';
      return;
    }

    const allowedRoles = (document.body.dataset.roles || '').split(',').filter(Boolean);
    if (allowedRoles.length && allowedRoles.indexOf(user.role) === -1) {
      window.location.href = 'dashboard.html';
      return;
    }

    const currentPage = window.location.pathname.split('/').pop();
    renderSidebar(user, currentPage);
    renderUserBox(user);
  });
})();
