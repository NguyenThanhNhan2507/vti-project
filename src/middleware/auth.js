const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Kiểm tra token trong header "Authorization: Bearer <token>".
// Sau khi xác thực token, đọc lại tài khoản từ CSDL để biết vai trò hiện tại và trạng thái khóa.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, full_name, role, is_active FROM users WHERE id = $1',
      [payload.sub]
    );
    const user = result.rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Tài khoản không còn hoạt động' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
    };
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// Chỉ cho phép các vai trò được liệt kê.
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
