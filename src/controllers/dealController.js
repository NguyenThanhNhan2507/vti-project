const pool = require('../config/db');
const { findVisibleCustomer, parseId } = require('./customerController');

// Cơ hội bán hàng được lọc theo khách hàng: nhân viên kinh doanh chỉ thấy cơ hội của khách mình phụ trách.
const SEE_ALL_ROLES = ['admin', 'manager'];
const STAGES = ['NEW', 'CONSULTING', 'WON', 'LOST'];

const DEAL_SELECT = `SELECT d.id, d.customer_id, d.title, d.value, d.stage, d.created_at,
                            c.name AS customer_name, c.company AS customer_company
                       FROM deals d
                       JOIN customers c ON c.id = d.customer_id`;

function toDto(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    title: row.title,
    value: Number(row.value),
    stage: row.stage,
    customerName: row.customer_name,
    customerCompany: row.customer_company,
    createdAt: row.created_at,
  };
}

// Trả về cơ hội nếu người đăng nhập được xem khách hàng của cơ hội đó, ngược lại trả về null.
async function findVisibleDeal(user, id) {
  const result = await pool.query(
    DEAL_SELECT + ' WHERE d.id = $1 AND ($2::boolean OR c.owner_id = $3)',
    [id, SEE_ALL_ROLES.includes(user.role), user.id]
  );
  return result.rows[0] || null;
}

// GET /api/deals
async function listDeals(req, res) {
  const params = [];
  let where = '';

  if (!SEE_ALL_ROLES.includes(req.user.role)) {
    params.push(req.user.id);
    where = 'WHERE c.owner_id = $1';
  }

  try {
    const result = await pool.query(`${DEAL_SELECT} ${where} ORDER BY d.id DESC`, params);
    return res.json({ deals: result.rows.map(toDto) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// POST /api/deals
async function createDeal(req, res) {
  const { customerId, title, value, stage } = req.body || {};
  const customerNumber = parseId(customerId);
  const cleanTitle = String(title || '').trim();
  const amount = Number(value);
  const cleanStage = stage || 'NEW';

  if (!customerNumber || !cleanTitle || value === undefined || value === '' || !Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ message: 'Thiếu hoặc sai thông tin cơ hội' });
  }
  if (!STAGES.includes(cleanStage)) {
    return res.status(400).json({ message: 'Giai đoạn không hợp lệ' });
  }

  try {
    const customer = await findVisibleCustomer(req.user, customerNumber);
    if (!customer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }

    const result = await pool.query(
      `INSERT INTO deals (customer_id, title, value, stage, owner_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [customerNumber, cleanTitle, amount, cleanStage, req.user.id]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, target_table, target_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'CREATE_DEAL', 'deals', result.rows[0].id]
    );

    const row = await findVisibleDeal(req.user, result.rows[0].id);
    return res.status(201).json({ deal: toDto(row) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// PATCH /api/deals/:id  (cập nhật một phần: title, value, stage)
async function updateDeal(req, res) {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Mã cơ hội không hợp lệ' });
  }

  const { title, value, stage } = req.body || {};

  let cleanTitle = null;
  if (title !== undefined) {
    cleanTitle = String(title).trim();
    if (!cleanTitle) {
      return res.status(400).json({ message: 'Tên cơ hội không được để trống' });
    }
  }

  let amount = null;
  if (value !== undefined) {
    amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ message: 'Giá trị không hợp lệ' });
    }
  }

  if (stage !== undefined && !STAGES.includes(stage)) {
    return res.status(400).json({ message: 'Giai đoạn không hợp lệ' });
  }

  try {
    const existing = await findVisibleDeal(req.user, id);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy cơ hội bán hàng' });
    }

    await pool.query(
      `UPDATE deals
          SET title = COALESCE($2, title),
              value = COALESCE($3, value),
              stage = COALESCE($4, stage)
        WHERE id = $1`,
      [id, cleanTitle, amount, stage ?? null]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, target_table, target_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'UPDATE_DEAL', 'deals', id]
    );

    const row = await findVisibleDeal(req.user, id);
    return res.json({ deal: toDto(row) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// DELETE /api/deals/:id (chỉ admin và quản lý)
async function deleteDeal(req, res) {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Mã cơ hội không hợp lệ' });
  }

  try {
    const result = await pool.query('DELETE FROM deals WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy cơ hội bán hàng' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, target_table, target_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'DELETE_DEAL', 'deals', id]
    );

    return res.json({ message: 'Đã xóa cơ hội bán hàng' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { listDeals, createDeal, updateDeal, deleteDeal };
