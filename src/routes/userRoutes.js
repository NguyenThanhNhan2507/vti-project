const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
} = require('../controllers/userController');

const router = express.Router();

// Toàn bộ API quản lý người dùng chỉ dành cho admin.
router.use(requireAuth, requireRole('admin'));

router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.post('/:id/reset-password', resetPassword);

module.exports = router;
