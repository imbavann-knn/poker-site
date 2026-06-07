const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { period } = req.query; // 'ytd', 'monthly', 'alltime'
    let dateFilter = '';
    const now = new Date();

    if (period === 'ytd') {
      dateFilter = `AND s.date >= '${now.getFullYear()}-01-01'`;
    } else if (period === 'monthly') {
      const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0');
      dateFilter = `AND s.date >= '${y}-${m}-01'`;
    }

    const result = await db.query(`
      SELECT
        p.id, p.name, p.alias, p.emoji,
        COUNT(sr.id) as sessions_played,
        COALESCE(SUM(sr.profit_loss), 0) as total_profit,
        COALESCE(MAX(sr.profit_loss), 0) as best_session,
        COALESCE(MIN(sr.profit_loss), 0) as worst_session,
        COUNT(CASE WHEN sr.profit_loss > 0 THEN 1 END) as wins,
        COUNT(CASE WHEN sr.profit_loss < 0 THEN 1 END) as losses,
        COUNT(CASE WHEN sr.profit_loss = 0 THEN 1 END) as breakeven
      FROM players p
      LEFT JOIN session_results sr ON sr.player_id = p.id
      LEFT JOIN sessions s ON s.id = sr.session_id ${dateFilter}
      GROUP BY p.id, p.name, p.alias, p.emoji
      HAVING COUNT(sr.id) > 0
      ORDER BY total_profit DESC
    `);

    // Group stats
    const groupStats = await db.query(`
      SELECT
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(DISTINCT p.id) as total_players,
        COALESCE(SUM(ABS(sr.profit_loss)) / 2, 0) as total_pot_moved,
        COALESCE(MAX(sr.profit_loss), 0) as biggest_win,
        COALESCE(MIN(sr.profit_loss), 0) as biggest_loss,
        ROUND(AVG(session_totals.duration_minutes)) as avg_duration
      FROM sessions s
      LEFT JOIN session_results sr ON sr.session_id = s.id
      LEFT JOIN players p ON p.id = sr.player_id
      LEFT JOIN (SELECT id, 240 as duration_minutes FROM sessions) session_totals ON session_totals.id = s.id
      WHERE s.status = 'completed' ${dateFilter.replace('AND s.', 'AND sessions.')}
    `);

    res.json({ leaderboard: result.rows, groupStats: groupStats.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
