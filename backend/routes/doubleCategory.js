const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { getIO } = require('../utils/socketInstance');

// POST /api/double-category
// Body: { session_id, team_id, category_id }
router.post('/', (req, res) => {
	const { session_id, team_id, category_id } = req.body;
	if (!session_id || !team_id || !category_id) {
		return res.status(400).json({ error: 'Missing required fields' });
	}
	db.run(
		'INSERT OR REPLACE INTO teams_double_category (session_id, team_id, category_id) VALUES (?, ?, ?)',
		[session_id, team_id, category_id],
		function (err) {
			if (err) {
				return res.status(500).json({ error: 'DB error' });
			}
			// Emit socket event to session room for real-time update
			try {
				const io = getIO();
				io.to(`session-${session_id}`).emit('double-category-updated', { session_id, team_id, category_id });
			} catch {}
			res.json({ success: true });
		}
	);
});

module.exports = router;
