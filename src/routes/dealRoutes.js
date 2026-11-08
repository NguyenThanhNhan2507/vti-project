const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { listDeals } = require('../controllers/dealController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listDeals);

module.exports = router;
