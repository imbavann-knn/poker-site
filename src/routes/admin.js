const express = require('express');
const router = express.Router();
const db = require('../db');

const checkPassword = (req, res, next) => {
  if (req.body.password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Invalid admin password' });
  next();
};

router.post('/delete-session', checkPassword, (req, res) => {
  try {
    db.sessions.delete(req.body.session_id);
    db.changelog.add('delete','session',req.body.session_id,'ADMIN','Admin deleted session');
    res.json({ message: 'Session deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/delete-player', checkPassword, (req, res) => {
  try {
    db.players.delete(req.body.player_id);
    db.changelog.add('delete','player',req.body.player_id,'ADMIN','Admin deleted player');
    res.json({ message: 'Player deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/delete-result', checkPassword, (req, res) => {
  try {
    db.results.delete(req.body.result_id);
    db.changelog.add('delete','result',req.body.result_id,'ADMIN','Admin deleted result');
    res.json({ message: 'Result deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/delete-changelog', checkPassword, (req, res) => {
  try {
    db.changelog.delete(req.body.entry_id);
    res.json({ message: 'Changelog entry deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
