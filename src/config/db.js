require('dotenv').config();

const { Pool } = require('pg');

// Một pool dùng chung cho toàn bộ ứng dụng.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
