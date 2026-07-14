const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getConnection } = require('../db/connection');

router.get('/', authenticate, (req, res) => {
  const db = getConnection();
  res.json(db.prepare('SELECT * FROM relay_states').all());
});

module.exports = router;
