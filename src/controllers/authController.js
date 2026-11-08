const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const INVALID_MESSAGE = 'Sai tài khoản hoặc mật khẩu';

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

// POST /api/auth/login
async function login(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Thiếu tài khoản hoặc mật khẩu' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, password_hash, full_name, role, is_active FROM users WHERE username = $1',
      [username]
    );
    const user = result.rows[0];

    // Không tiết lộ là sai tài khoản hay sai mật khẩu.
    if (!user) {
      return res.status(401).json({ message: INVALID_MESSAGE });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: INVALID_MESSAGE });
    }

    // Chỉ báo tài khoản bị khóa khi đã nhập đúng mật khẩu.
    if (!user.is_active) {
      return res.status(403).json({
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ ban quản trị hoặc quản lý để được mở lại.',
      });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
      [user.id, 'LOGIN']
    );

    return res.json({
      token: signToken(user),
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { login };
