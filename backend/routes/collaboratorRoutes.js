const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { createCollaborator, listCollaborators, deactivateCollaborator } = require('../controllers/collaboratorController');

router.use(authenticate, requireRole('admin'));
router.post('/', createCollaborator);
router.get('/', listCollaborators);
router.patch('/:id/deactivate', deactivateCollaborator);

module.exports = router;
