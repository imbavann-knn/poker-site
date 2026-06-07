const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    res.json(db.sessions.getAll(req.query.status));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const s = db.sessions.getById(req.params.id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', (req, res) => {
  try {
    const { date, time, venue, host, blinds, notes, created_by } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });
    const session = db.sessions.create({ date, time: time||'20:00', venue: venue||'', host: host||'', blinds: blinds||'0.10/0.20', notes: notes||'', created_by: created_by||'Anonymous' });
    db.changelog.add('create','session',session.id, created_by||'Anonymous', `Created session for ${date}`, null, session);
    res.status(201).json(session);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', (req, res) => {
  try {
    const { date, time, venue, host, blinds, notes, status, editor_name } = req.body;
    const old = db.sessions.getById(req.params.id);
    if (!old) return res.status(404).json({ error: 'Session not found' });
    const updates = {};
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;
    if (venue !== undefined) updates.venue = venue;
    if (host !== undefined) updates.host = host;
    if (blinds !== undefined) updates.blinds = blinds;
    if (notes !== undefined) updates.notes = notes;
    if (status !== undefined) updates.status = status;
    const updated = db.sessions.update(req.params.id, updates);
    db.changelog.add('update','session',req.params.id, editor_name||'Anonymous', `Updated session ${date||old.date}`, old, updated);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST add attendance
router.post('/:id/attendance', (req, res) => {
  try {
    const { player_id, added_by } = req.body;
    const player = db.players.getById(player_id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const entry = db.attendance.add(req.params.id, player_id, added_by||'Anonymous');
    if (!entry) return res.json({ message: 'Already in attendance' });
    db.changelog.add('create','attendance',req.params.id, added_by||'Anonymous', `Added ${player.name} to session`);
    res.status(201).json(entry);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE remove attendance
router.delete('/:id/attendance/:player_id', (req, res) => {
  try {
    const player = db.players.getById(req.params.player_id);
    const editor = req.body?.editor_name || 'Anonymous';
    db.attendance.remove(req.params.id, req.params.player_id);
    db.changelog.add('delete','attendance',req.params.id, editor, `Removed ${player?.name||'player'} from session`);
    res.json({ message: 'Removed from attendance' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET highlights for a session
router.get('/:id/highlights', (req, res) => {
  try {
    const highlights = db.highlights.getBySession(req.params.id);
    // Enrich with player info
    const enriched = highlights.map(h => {
      if (h.author_player_id) {
        const p = db.players.getById(h.author_player_id);
        return { ...h, player_name: p?.name, player_emoji: p?.emoji, player_photo: p?.photo };
      }
      return h;
    });
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create highlight
router.post('/:id/highlights', (req, res) => {
  try {
    const { text, images, video_url, author_name, author_player_id } = req.body;
    if (!text && (!images || !images.length) && !video_url) {
      return res.status(400).json({ error: 'Add some text, an image, or a video link' });
    }
    const highlight = db.highlights.create({
      session_id: req.params.id,
      text: text || null,
      images: images || [],   // array of base64 strings
      video_url: video_url || null,
      author_name: author_name || 'Anonymous',
      author_player_id: author_player_id || null,
    });
    db.changelog.add('create', 'highlight', req.params.id, author_name || 'Anonymous',
      `Added highlight to session`);
    res.status(201).json(highlight);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE highlight
router.delete('/:id/highlights/:hid', (req, res) => {
  try {
    db.highlights.delete(req.params.hid);
    res.json({ message: 'Highlight deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
