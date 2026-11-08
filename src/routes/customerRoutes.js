const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listCustomers, createCustomer, listAssignees } = require('../controllers/customerController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listCustomers);
router.post('/', createCustomer);
router.get('/assignees', requireRole('admin', 'manager'), listAssignees);

module.exports = router;
