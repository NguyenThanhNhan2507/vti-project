// Tạo tài khoản admin đầu tiên.
// Cách dùng: node src/scripts/create-admin.js <tai_khoan> <mat_khau> [ho_ten]
require('dotenv').config();

const bcrypt = require('bcrypt');
const pool = require('../config/db');

async function main() {
  const [, , username, password, fullName = 'Quản trị viên'] = process.argv;

  if (!username || !password) {
    console.log('Cách dùng: node src/scripts/create-admin.js <tai_khoan> <mat_khau> [ho_ten]');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (username, password_hash, full_name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (username) DO NOTHING`,
    [username, hash, fullName]
  );

  if (result.rowCount === 0) {
    console.log(`Tài khoản "${username}" đã tồn tại, không tạo thêm.`);
  } else {
    console.log(`Đã tạo tài khoản admin: ${username}`);
  }

  await pool.end();
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
