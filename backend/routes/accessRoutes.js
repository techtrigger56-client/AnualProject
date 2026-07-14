const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth');
const asyncHandler = require('../middleware/asyncHandler');
const { toggleAccess, getLogs } = require('../controllers/accessController');

router.post('/toggle', deviceAuth, asyncHandler(toggleAccess));
router.get('/logs', authenticate, requireRole('admin', 'worker'), getLogs);

module.exports = router;
