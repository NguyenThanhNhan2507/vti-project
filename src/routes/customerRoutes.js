const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listAssignees,
} = require('../controllers/customerController');
const { listContacts, createContact } = require('../controllers/contactController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listCustomers);
router.post('/', createCustomer);
// Route cố định phải khai báo trước route có tham số /:id.
router.get('/assignees', requireRole('admin', 'manager'), listAssignees);
router.get('/:id', getCustomer);
router.patch('/:id', updateCustomer);
router.delete('/:id', requireRole('admin', 'manager'), deleteCustomer);

router.get('/:id/contacts', listContacts);
router.post('/:id/contacts', createContact);

module.exports = router;
