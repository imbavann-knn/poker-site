const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    res.json(db.leaderboard.get(req.query.period));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
