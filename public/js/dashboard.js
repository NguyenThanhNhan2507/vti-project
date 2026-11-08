// Trang tổng quan: số liệu và bảng cơ hội lấy từ API, đã được lọc theo quyền của người đăng nhập.
(function () {
  const STAGE_LABELS = {
    NEW: 'Mới',
    CONSULTING: 'Đang tư vấn',
    WON: 'Thành công',
    LOST: 'Thất bại'
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString('vi-VN') + ' ₫';
  }

  function isThisMonth(iso) {
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  function renderStats(customers, deals) {
    const open = deals.filter(function (d) { return d.stage === 'NEW' || d.stage === 'CONSULTING'; }).length;
    const won = deals.filter(function (d) { return d.stage === 'WON'; }).length;
    const revenue = deals
      .filter(function (d) { return d.stage === 'WON' && isThisMonth(d.createdAt); })
      .reduce(function (sum, d) { return sum + Number(d.value); }, 0);

    const items = [
      { label: 'Tổng khách hàng', value: customers.length },
      { label: 'Cơ hội đang mở', value: open },
      { label: 'Đã thành công', value: won },
      { label: 'Doanh số tháng này', value: formatMoney(revenue) }
    ];

    document.getElementById('stats').innerHTML = items.map(function (item) {
      return '<div class="stat-card">' +
        '<span class="stat-label">' + esc(item.label) + '</span>' +
        '<strong class="stat-value">' + esc(item.value) + '</strong>' +
        '</div>';
    }).join('');
  }

  function renderDeals(deals) {
    const body = document.getElementById('deals-body');

    if (deals.length === 0) {
      body.innerHTML = '<tr><td colspan="4" class="empty">Chưa có cơ hội bán hàng</td></tr>';
      return;
    }

    body.innerHTML = deals.map(function (deal) {
      return '<tr>' +
        '<td>' + esc(deal.title) + '</td>' +
        '<td>' + esc(deal.customerName) + '</td>' +
        '<td>' + formatMoney(deal.value) + '</td>' +
        '<td><span class="badge badge-' + esc(deal.stage.toLowerCase()) + '">' +
          esc(STAGE_LABELS[deal.stage] || deal.stage) + '</span></td>' +
        '</tr>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    Promise.all([window.api('/api/customers'), window.api('/api/deals')])
      .then(function (results) {
        renderStats(results[0].customers, results[1].deals);
        renderDeals(results[1].deals);
      })
      .catch(function (err) {
        document.getElementById('deals-body').innerHTML =
          '<tr><td colspan="4" class="empty">' + esc(err.message) + '</td></tr>';
      });
  });
})();
