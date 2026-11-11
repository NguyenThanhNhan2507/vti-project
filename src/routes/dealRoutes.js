const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listDeals, createDeal, updateDeal, deleteDeal } = require('../controllers/dealController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listDeals);
router.post('/', createDeal);
router.patch('/:id', updateDeal);
router.delete('/:id', requireRole('admin', 'manager'), deleteDeal);

module.exports = router;
