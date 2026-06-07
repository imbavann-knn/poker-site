const express = require('express');
const router = express.Router();
const db = require('../db');

const checkPassword = (req, res, next) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Invalid admin password' });
  }
  next();
};

// DELETE a session entirely
router.post('/delete-session', checkPassword, async (req, res) => {
  try {
    const { session_id } = req.body;
    await db.query('DELETE FROM sessions WHERE id = $1', [session_id]);
    await db.query(
      `INSERT INTO changelog (action, entity_type, entity_id, editor_name, description)
       VALUES ('delete', 'session', $1, 'ADMIN', 'Admin deleted session')`,
      [session_id]
    );
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a player entirely
router.post('/delete-player', checkPassword, async (req, res) => {
  try {
    const { player_id } = req.body;
    await db.query('DELETE FROM players WHERE id = $1', [player_id]);
    await db.query(
      `INSERT INTO changelog (action, entity_type, entity_id, editor_name, description)
       VALUES ('delete', 'player', $1, 'ADMIN', 'Admin deleted player')`,
      [player_id]
    );
    res.json({ message: 'Player deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a result entry
router.post('/delete-result', checkPassword, async (req, res) => {
  try {
    const { result_id } = req.body;
    await db.query('DELETE FROM session_results WHERE id = $1', [result_id]);
    await db.query(
      `INSERT INTO changelog (action, entity_type, entity_id, editor_name, description)
       VALUES ('delete', 'result', $1, 'ADMIN', 'Admin deleted result')`,
      [result_id]
    );
    res.json({ message: 'Result deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a changelog entry
router.post('/delete-changelog', checkPassword, async (req, res) => {
  try {
    const { entry_id } = req.body;
    await db.query('DELETE FROM changelog WHERE id = $1', [entry_id]);
    res.json({ message: 'Changelog entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
