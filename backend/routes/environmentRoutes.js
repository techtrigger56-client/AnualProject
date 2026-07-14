const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth');
const { recordReading, getReadings } = require('../controllers/environmentController');

router.post('/', deviceAuth, recordReading);
router.get('/', authenticate, getReadings);

module.exports = router;
