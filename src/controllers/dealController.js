const pool = require('../config/db');

// Cơ hội bán hàng được lọc theo khách hàng: nhân viên kinh doanh chỉ thấy cơ hội của khách mình phụ trách.
const SEE_ALL_ROLES = ['admin', 'manager'];

// GET /api/deals
async function listDeals(req, res) {
  const params = [];
  let where = '';

  if (!SEE_ALL_ROLES.includes(req.user.role)) {
    params.push(req.user.id);
    where = 'WHERE c.owner_id = $1';
  }

  try {
    const result = await pool.query(
      `SELECT d.id, d.title, d.value, d.stage, d.created_at,
              c.name AS customer_name, c.company AS customer_company
         FROM deals d
         JOIN customers c ON c.id = d.customer_id
         ${where}
        ORDER BY d.id DESC`,
      params
    );

    const deals = result.rows.map(function (row) {
      return {
        id: row.id,
        title: row.title,
        value: Number(row.value),
        stage: row.stage,
        customerName: row.customer_name,
        customerCompany: row.customer_company,
        createdAt: row.created_at,
      };
    });

    return res.json({ deals });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { listDeals };
