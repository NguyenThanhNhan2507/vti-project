const pool = require('../config/db');
const { findVisibleCustomer, parseId } = require('./customerController');

const CONTACT_TYPES = ['call', 'email', 'meeting'];

function toDto(row) {
  return {
    id: row.id,
    contactType: row.contact_type,
    note: row.note,
    createdAt: row.created_at,
    createdByName: row.created_by_name || null,
  };
}

// GET /api/customers/:id/contacts
async function listContacts(req, res) {
  const customerId = parseId(req.params.id);
  if (!customerId) {
    return res.status(400).json({ message: 'Mã khách hàng không hợp lệ' });
  }

  try {
    const customer = await findVisibleCustomer(req.user, customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }

    const result = await pool.query(
      `SELECT ct.id, ct.contact_type, ct.note, ct.created_at, u.full_name AS created_by_name
         FROM contacts ct
         LEFT JOIN users u ON u.id = ct.created_by
        WHERE ct.customer_id = $1
        ORDER BY ct.created_at DESC, ct.id DESC`,
      [customerId]
    );
    return res.json({ contacts: result.rows.map(toDto) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// POST /api/customers/:id/contacts
async function createContact(req, res) {
  const customerId = parseId(req.params.id);
  if (!customerId) {
    return res.status(400).json({ message: 'Mã khách hàng không hợp lệ' });
  }

  const { contactType, note } = req.body || {};
  if (!CONTACT_TYPES.includes(contactType)) {
    return res.status(400).json({ message: 'Loại liên hệ không hợp lệ' });
  }

  try {
    const customer = await findVisibleCustomer(req.user, customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }

    const result = await pool.query(
      `INSERT INTO contacts (customer_id, contact_type, note, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, contact_type, note, created_at`,
      [customerId, contactType, String(note || '').trim() || null, req.user.id]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, target_table, target_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'CREATE_CONTACT', 'contacts', result.rows[0].id]
    );

    const row = { ...result.rows[0], created_by_name: req.user.fullName };
    return res.status(201).json({ contact: toDto(row) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { listContacts, createContact };
