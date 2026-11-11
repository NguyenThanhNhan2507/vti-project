// Trang chi tiết khách hàng: sửa thông tin, xem và thêm lịch sử liên hệ.
(function () {
  const SEE_ALL_ROLES = ['admin', 'manager'];
  const CONTACT_LABELS = { call: 'Gọi điện', email: 'Email', meeting: 'Gặp mặt' };
  const customerId = Number(new URLSearchParams(window.location.search).get('id'));
  let me = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showMessage(id, text, isError) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = 'message ' + (isError ? 'error' : 'success');
    el.hidden = false;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('vi-VN');
  }

  async function setupOwnerSelect() {
    if (SEE_ALL_ROLES.indexOf(me.role) === -1) return;

    const data = await window.api('/api/customers/assignees');
    document.getElementById('owner-select').innerHTML = data.users.map(function (u) {
      return '<option value="' + u.id + '">' + esc(u.fullName) + ' - ' + esc(u.role) + '</option>';
    }).join('');
    document.getElementById('owner-field').hidden = false;
  }

  async function loadCustomer() {
    const data = await window.api('/api/customers/' + customerId);
    const c = data.customer;
    const form = document.getElementById('edit-form');
    const f = form.elements;

    f.name.value = c.name || '';
    f.phone.value = c.phone || '';
    f.company.value = c.company || '';
    f.email.value = c.email || '';
    if (SEE_ALL_ROLES.indexOf(me.role) !== -1) {
      f.ownerId.value = String(c.ownerId);
    }
    document.title = c.name + ' - CRM VTI';
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    const f = event.target.elements;

    const payload = {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      company: f.company.value.trim(),
      email: f.email.value.trim()
    };
    if (SEE_ALL_ROLES.indexOf(me.role) !== -1) {
      payload.ownerId = Number(f.ownerId.value);
    }

    try {
      await window.api('/api/customers/' + customerId, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      showMessage('edit-message', 'Đã lưu thông tin khách hàng.', false);
      await loadCustomer();
    } catch (err) {
      showMessage('edit-message', err.message, true);
    }
  }

  function renderContacts(list) {
    const body = document.getElementById('contacts-body');

    if (list.length === 0) {
      body.innerHTML = '<tr><td colspan="4" class="empty">Chưa có liên hệ nào</td></tr>';
      return;
    }

    body.innerHTML = list.map(function (c) {
      return '<tr>' +
        '<td>' + esc(formatDate(c.createdAt)) + '</td>' +
        '<td>' + esc(CONTACT_LABELS[c.contactType] || c.contactType) + '</td>' +
        '<td>' + esc(c.note) + '</td>' +
        '<td>' + esc(c.createdByName) + '</td>' +
        '</tr>';
    }).join('');
  }

  async function loadContacts() {
    const data = await window.api('/api/customers/' + customerId + '/contacts');
    renderContacts(data.contacts);
  }

  async function handleContactSubmit(event) {
    event.preventDefault();
    const f = event.target.elements;

    try {
      await window.api('/api/customers/' + customerId + '/contacts', {
        method: 'POST',
        body: JSON.stringify({ contactType: f.contactType.value, note: f.note.value.trim() })
      });
      f.note.value = '';
      showMessage('contact-message', 'Đã thêm liên hệ.', false);
      await loadContacts();
    } catch (err) {
      showMessage('contact-message', err.message, true);
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    me = window.Session.getUser();

    if (!customerId) {
      showMessage('edit-message', 'Thiếu mã khách hàng trên đường dẫn.', true);
      return;
    }

    document.getElementById('edit-form').addEventListener('submit', handleEditSubmit);
    document.getElementById('contact-form').addEventListener('submit', handleContactSubmit);

    try {
      await setupOwnerSelect();
      await loadCustomer();
      await loadContacts();
    } catch (err) {
      showMessage('edit-message', err.message, true);
    }
  });
})();
