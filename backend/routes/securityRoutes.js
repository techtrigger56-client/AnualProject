const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { triggerLockdown, triggerEvacuation, resolveEvent, getEvents } = require('../controllers/securityController');

router.use(authenticate);
router.get('/events', getEvents);
router.post('/lockdown', requireRole('admin'), triggerLockdown);
router.post('/evacuation', requireRole('admin'), triggerEvacuation);
router.patch('/events/:eventId/resolve', requireRole('admin'), resolveEvent);

module.exports = router;
