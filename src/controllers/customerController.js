const pool = require('../config/db');

// Admin và quản lý thấy toàn bộ khách hàng; nhân viên kinh doanh chỉ thấy khách do mình phụ trách.
const SEE_ALL_ROLES = ['admin', 'manager'];

function canSeeAll(user) {
  return SEE_ALL_ROLES.includes(user.role);
}

function toDto(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    company: row.company,
    ownerId: row.owner_id,
    owner: row.owner_name,
    createdAt: row.created_at,
  };
}

// GET /api/customers?q=từ-khóa
async function listCustomers(req, res) {
  const keyword = String(req.query.q || '').trim();
  const params = [];
  const conditions = [];

  if (keyword) {
    params.push('%' + keyword + '%');
    const p = '$' + params.length;
    conditions.push('(c.name ILIKE ' + p + ' OR c.company ILIKE ' + p + ' OR c.phone ILIKE ' + p + ')');
  }

  if (!canSeeAll(req.user)) {
    params.push(req.user.id);
    conditions.push('c.owner_id = $' + params.length);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.phone, c.email, c.company, c.owner_id,
              u.full_name AS owner_name, c.created_at
         FROM customers c
         LEFT JOIN users u ON u.id = c.owner_id
         ${where}
        ORDER BY c.id DESC`,
      params
    );
    return res.json({ customers: result.rows.map(toDto) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// POST /api/customers
async function createCustomer(req, res) {
  const { name, phone, email, company, ownerId } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({ message: 'Thiếu tên hoặc số điện thoại' });
  }

  // Nhân viên kinh doanh luôn là người phụ trách; admin/quản lý có thể chọn người phụ trách khác.
  let owner = req.user.id;
  if (canSeeAll(req.user) && ownerId !== undefined && ownerId !== null && ownerId !== '') {
    owner = Number(ownerId);
    if (!Number.isInteger(owner)) {
      return res.status(400).json({ message: 'Người phụ trách không hợp lệ' });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO customers (name, phone, email, company, owner_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, phone, email, company, owner_id, created_at`,
      [
        name.trim(),
        phone.trim(),
        (email || '').trim() || null,
        (company || '').trim() || null,
        owner,
      ]
    );

    const row = result.rows[0];
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, target_table, target_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'CREATE_CUSTOMER', 'customers', row.id]
    );

    return res.status(201).json({ customer: toDto({ ...row, owner_name: null }) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Số điện thoại đã tồn tại' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Người phụ trách không tồn tại' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// GET /api/customers/assignees: danh sách người có thể được chọn làm người phụ trách (chỉ admin và quản lý gọi).
async function listAssignees(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, full_name, role FROM users WHERE is_active = TRUE ORDER BY full_name'
    );
    return res.json({
      users: result.rows.map(function (row) {
        return { id: row.id, fullName: row.full_name, role: row.role };
      }),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { listCustomers, createCustomer, listAssignees };
