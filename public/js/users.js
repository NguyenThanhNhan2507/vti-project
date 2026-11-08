// Trang quản lý người dùng (chỉ admin). Gọi API /api/users để thêm, đổi vai trò, khóa/mở khóa, đặt lại mật khẩu.
(function () {
  const ROLE_OPTIONS = [
    { value: 'admin', label: 'Quản trị viên' },
    { value: 'manager', label: 'Quản lý' },
    { value: 'sales', label: 'Nhân viên kinh doanh' }
  ];

  let users = [];
  let me = null;

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showMessage(id, text, isError) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = 'message ' + (isError ? 'error' : 'success');
    el.hidden = false;
  }

  function roleSelect(user) {
    const options = ROLE_OPTIONS.map(function (option) {
      const selected = option.value === user.role ? ' selected' : '';
      return '<option value="' + option.value + '"' + selected + '>' + option.label + '</option>';
    }).join('');
    const disabled = user.id === me.id ? ' disabled' : '';
    return '<select class="role-select" data-action="role" data-id="' + user.id + '"' + disabled + '>' + options + '</select>';
  }

  function render() {
    const body = document.getElementById('users-body');

    body.innerHTML = users.map(function (user) {
      const self = user.id === me.id;
      const status = user.isActive
        ? '<span class="badge badge-active">Hoạt động</span>'
        : '<span class="badge badge-locked">Đã khóa</span>';
      const toggleLabel = user.isActive ? 'Khóa' : 'Mở khóa';
      const toggleDisabled = self ? ' disabled' : '';
      const selfNote = self ? ' <small>(bạn)</small>' : '';

      return '<tr>' +
        '<td>' + esc(user.username) + selfNote + '</td>' +
        '<td>' + esc(user.fullName) + '</td>' +
        '<td>' + roleSelect(user) + '</td>' +
        '<td>' + status + '</td>' +
        '<td class="actions">' +
          '<button type="button" class="btn-small" data-action="toggle" data-id="' + user.id + '"' + toggleDisabled + '>' + toggleLabel + '</button> ' +
          '<button type="button" class="btn-small" data-action="reset" data-id="' + user.id + '">Đặt lại mật khẩu</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  async function loadUsers() {
    const data = await window.api('/api/users');
    users = data.users;
    render();
  }

  async function handleRoleChange(event) {
    const target = event.target;
    if (target.dataset.action !== 'role') return;

    const id = Number(target.dataset.id);
    try {
      await window.api('/api/users/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ role: target.value })
      });
      showMessage('table-message', 'Đã cập nhật vai trò.', false);
      await loadUsers();
    } catch (err) {
      showMessage('table-message', err.message, true);
      await loadUsers();
    }
  }

  async function handleTableClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;

    const id = Number(button.dataset.id);
    const user = users.find(function (u) { return u.id === id; });
    if (!user) return;

    try {
      if (button.dataset.action === 'toggle') {
        await window.api('/api/users/' + id, {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !user.isActive })
        });
        showMessage('table-message', user.isActive ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.', false);
      }

      if (button.dataset.action === 'reset') {
        const password = window.prompt('Nhập mật khẩu mới cho ' + user.username + ' (tối thiểu 6 ký tự):');
        if (!password) return;

        await window.api('/api/users/' + id + '/reset-password', {
          method: 'POST',
          body: JSON.stringify({ password: password })
        });
        showMessage('table-message', 'Đã đặt lại mật khẩu cho ' + user.username + '.', false);
      }

      await loadUsers();
    } catch (err) {
      showMessage('table-message', err.message, true);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    const form = event.target;

    const payload = {
      username: form.username.value.trim(),
      fullName: form.fullName.value.trim(),
      password: form.password.value,
      role: form.role.value
    };

    try {
      await window.api('/api/users', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      form.reset();
      showMessage('form-message', 'Đã thêm người dùng ' + payload.username + '.', false);
      await loadUsers();
    } catch (err) {
      showMessage('form-message', err.message, true);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    me = window.Session.getUser();

    document.getElementById('create-form').addEventListener('submit', handleCreate);
    document.getElementById('users-body').addEventListener('click', handleTableClick);
    document.getElementById('users-body').addEventListener('change', handleRoleChange);

    loadUsers().catch(function (err) {
      showMessage('table-message', err.message, true);
    });
  });
})();
