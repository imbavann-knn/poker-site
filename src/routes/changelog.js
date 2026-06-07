const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    res.json(db.changelog.getAll(parseInt(limit), parseInt(offset)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
