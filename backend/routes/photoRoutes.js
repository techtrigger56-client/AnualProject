const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth');
const { receivePhoto, listPhotos } = require('../controllers/photoController');

router.post('/', deviceAuth, receivePhoto);
router.get('/', authenticate, listPhotos);

module.exports = router;
