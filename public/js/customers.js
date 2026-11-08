// Trang khách hàng: lấy danh sách từ API, tìm kiếm có trễ 300ms, form thêm khách hàng,
// và ô chọn người phụ trách (chỉ admin và quản lý thấy).
(function () {
  let timer = null;
  const SEE_ALL_ROLES = ['admin', 'manager'];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showMessage(text, isError) {
    const el = document.getElementById('form-message');
    el.textContent = text;
    el.className = 'message ' + (isError ? 'error' : 'success');
    el.hidden = false;
  }

  function renderRows(list) {
    const body = document.getElementById('customers-body');

    if (list.length === 0) {
      body.innerHTML = '<tr><td colspan="5" class="empty">Không tìm thấy khách hàng</td></tr>';
      return;
    }

    body.innerHTML = list.map(function (c) {
      return '<tr>' +
        '<td>' + esc(c.name) + '</td>' +
        '<td>' + esc(c.company) + '</td>' +
        '<td>' + esc(c.phone) + '</td>' +
        '<td>' + esc(c.email) + '</td>' +
        '<td>' + esc(c.owner) + '</td>' +
        '</tr>';
    }).join('');
  }

  async function load(keyword) {
    const body = document.getElementById('customers-body');
    try {
      const query = keyword ? '?q=' + encodeURIComponent(keyword) : '';
      const data = await window.api('/api/customers' + query);
      renderRows(data.customers);
    } catch (err) {
      body.innerHTML = '<tr><td colspan="5" class="empty">' + esc(err.message) + '</td></tr>';
    }
  }

  // Với admin và quản lý: hiện ô chọn người phụ trách, mặc định là chính mình.
  async function setupOwnerSelect(me) {
    if (SEE_ALL_ROLES.indexOf(me.role) === -1) return;

    try {
      const data = await window.api('/api/customers/assignees');
      const select = document.getElementById('owner-select');
      select.innerHTML = '<option value="">Tôi (' + esc(me.fullName) + ')</option>' +
        data.users.map(function (u) {
          return '<option value="' + u.id + '">' + esc(u.fullName) + ' - ' + esc(u.role) + '</option>';
        }).join('');
      document.getElementById('owner-field').hidden = false;
    } catch (err) {
      showMessage(err.message, true);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    const form = event.target;

    const payload = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      company: form.company.value.trim(),
      email: form.email.value.trim()
    };
    if (form.ownerId && form.ownerId.value) {
      payload.ownerId = Number(form.ownerId.value);
    }

    try {
      await window.api('/api/customers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      form.reset();
      showMessage('Đã thêm khách hàng ' + payload.name + '.', false);
      await load(document.getElementById('search').value.trim());
    } catch (err) {
      showMessage(err.message, true);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const search = document.getElementById('search');
    const me = window.Session.getUser();

    document.getElementById('create-form').addEventListener('submit', handleCreate);

    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        load(search.value.trim());
      }, 300);
    });

    setupOwnerSelect(me);
    load('');
  });
})();
