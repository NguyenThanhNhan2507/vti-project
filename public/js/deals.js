// Trang cơ hội bán hàng: danh sách theo quyền, thêm mới, đổi giai đoạn ngay trên bảng,
// và xóa (chỉ admin và quản lý thấy).
(function () {
  const SEE_ALL_ROLES = ['admin', 'manager'];
  const STAGE_OPTIONS = [
    { value: 'NEW', label: 'Mới' },
    { value: 'CONSULTING', label: 'Đang tư vấn' },
    { value: 'WON', label: 'Thành công' },
    { value: 'LOST', label: 'Thất bại' }
  ];
  let me = null;
  let deals = [];

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

  function formatMoney(value) {
    return Number(value || 0).toLocaleString('vi-VN') + ' ₫';
  }

  function stageSelect(deal) {
    const options = STAGE_OPTIONS.map(function (o) {
      const selected = o.value === deal.stage ? ' selected' : '';
      return '<option value="' + o.value + '"' + selected + '>' + o.label + '</option>';
    }).join('');
    return '<select class="role-select" data-action="stage" data-id="' + deal.id + '">' + options + '</select>';
  }

  function renderDeals() {
    const body = document.getElementById('deals-body');

    if (deals.length === 0) {
      body.innerHTML = '<tr><td colspan="5" class="empty">Chưa có cơ hội bán hàng</td></tr>';
      return;
    }

    const canDelete = SEE_ALL_ROLES.indexOf(me.role) !== -1;

    body.innerHTML = deals.map(function (d) {
      const deleteButton = canDelete
        ? '<button type="button" class="btn-small danger" data-action="delete" data-id="' + d.id + '">Xóa</button>'
        : '';

      return '<tr>' +
        '<td>' + esc(d.title) + '</td>' +
        '<td>' + esc(d.customerName) + '</td>' +
        '<td>' + formatMoney(d.value) + '</td>' +
        '<td>' + stageSelect(d) + '</td>' +
        '<td class="actions">' + deleteButton + '</td>' +
        '</tr>';
    }).join('');
  }

  async function loadCustomers() {
    const data = await window.api('/api/customers');
    document.getElementById('customer-select').innerHTML =
      '<option value="">-- Chọn khách hàng --</option>' +
      data.customers.map(function (c) {
        const company = c.company ? ' - ' + esc(c.company) : '';
        return '<option value="' + c.id + '">' + esc(c.name) + company + '</option>';
      }).join('');
  }

  async function loadDeals() {
    const data = await window.api('/api/deals');
    deals = data.deals;
    renderDeals();
  }

  async function handleCreate(event) {
    event.preventDefault();
    const f = event.target.elements;

    const payload = {
      customerId: Number(f.customerId.value),
      title: f.title.value.trim(),
      value: Number(f.value.value),
      stage: f.stage.value
    };

    try {
      await window.api('/api/deals', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      event.target.reset();
      showMessage('form-message', 'Đã thêm cơ hội ' + payload.title + '.', false);
      await loadDeals();
    } catch (err) {
      showMessage('form-message', err.message, true);
    }
  }

  async function handleStageChange(event) {
    const target = event.target;
    if (target.dataset.action !== 'stage') return;

    try {
      await window.api('/api/deals/' + target.dataset.id, {
        method: 'PATCH',
        body: JSON.stringify({ stage: target.value })
      });
      showMessage('table-message', 'Đã cập nhật giai đoạn.', false);
      await loadDeals();
    } catch (err) {
      showMessage('table-message', err.message, true);
      await loadDeals();
    }
  }

  async function handleDelete(event) {
    const button = event.target.closest('button[data-action="delete"]');
    if (!button) return;

    const id = Number(button.dataset.id);
    const deal = deals.find(function (d) { return d.id === id; });
    if (!deal || !window.confirm('Xóa cơ hội "' + deal.title + '"?')) return;

    try {
      await window.api('/api/deals/' + id, { method: 'DELETE' });
      showMessage('table-message', 'Đã xóa cơ hội.', false);
      await loadDeals();
    } catch (err) {
      showMessage('table-message', err.message, true);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    me = window.Session.getUser();

    document.getElementById('create-form').addEventListener('submit', handleCreate);

    const body = document.getElementById('deals-body');
    body.addEventListener('change', handleStageChange);
    body.addEventListener('click', handleDelete);

    Promise.all([loadCustomers(), loadDeals()]).catch(function (err) {
      showMessage('table-message', err.message, true);
    });
  });
})();
