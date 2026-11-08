const bcrypt = require('bcrypt');
const pool = require('../config/db');

const ROLES = ['admin', 'manager', 'sales'];
const MIN_PASSWORD_LENGTH = 6;

function toDto(row) {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

async function writeAudit(userId, action, targetId) {
  await pool.query(
    'INSERT INTO audit_logs (user_id, action, target_table, target_id) VALUES ($1, $2, $3, $4)',
    [userId, action, 'users', targetId]
  );
}

// GET /api/users
async function listUsers(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY id'
    );
    return res.json({ users: result.rows.map(toDto) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// POST /api/users
async function createUser(req, res) {
  const { username, password, fullName, role } = req.body || {};

  if (!username || !password || !fullName || !role) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ message: 'Vai trò không hợp lệ' });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, full_name, role, is_active, created_at`,
      [username.trim(), hash, fullName.trim(), role]
    );

    await writeAudit(req.user.id, 'CREATE_USER', result.rows[0].id);
    return res.status(201).json({ user: toDto(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Tài khoản đã tồn tại' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// PATCH /api/users/:id  (đổi họ tên, vai trò hoặc trạng thái khóa)
async function updateUser(req, res) {
  const id = Number(req.params.id);
  const { fullName, role, isActive } = req.body || {};

  if (role !== undefined && !ROLES.includes(role)) {
    return res.status(400).json({ message: 'Vai trò không hợp lệ' });
  }
  if (fullName !== undefined && !String(fullName).trim()) {
    return res.status(400).json({ message: 'Họ và tên không được để trống' });
  }

  // Không cho admin tự khóa hoặc tự hạ quyền chính mình, tránh mất quyền quản trị.
  const selfLockOrDemote =
    id === req.user.id && (isActive === false || (role !== undefined && role !== 'admin'));
  if (selfLockOrDemote) {
    return res.status(400).json({ message: 'Không thể tự khóa hoặc tự hạ quyền tài khoản đang đăng nhập' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
          SET full_name = COALESCE($2, full_name),
              role = COALESCE($3, role),
              is_active = COALESCE($4, is_active)
        WHERE id = $1
        RETURNING id, username, full_name, role, is_active, created_at`,
      [id, fullName !== undefined ? String(fullName).trim() : null, role ?? null, isActive ?? null]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    await writeAudit(req.user.id, 'UPDATE_USER', id);
    return res.json({ user: toDto(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// POST /api/users/:id/reset-password
async function resetPassword(req, res) {
  const id = Number(req.params.id);
  const { password } = req.body || {};

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE users SET password_hash = $2 WHERE id = $1',
      [id, hash]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    await writeAudit(req.user.id, 'RESET_PASSWORD', id);
    return res.json({ message: 'Đã đặt lại mật khẩu' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { listUsers, createUser, updateUser, resetPassword };
