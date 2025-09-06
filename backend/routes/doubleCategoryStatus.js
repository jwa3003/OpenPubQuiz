const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/double-category/status?session_id=...
router.get('/status', (req, res) => {
	const session_id = req.query.session_id;
	if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

	// Get all team IDs for this session
	db.all('SELECT team_id FROM quiz_sessions_teams WHERE session_id = ?', [session_id], (err, allTeams) => {
		if (err) return res.status(500).json({ error: 'DB error' });
		const allTeamIds = (allTeams || []).map(t => t.team_id);
		db.all('SELECT team_id FROM teams_double_category WHERE session_id = ?', [session_id], (err2, selectedRows) => {
			if (err2) return res.status(500).json({ error: 'DB error' });
			const selectedTeamIds = (selectedRows || []).map(r => r.team_id);
			const notSelectedTeamIds = allTeamIds.filter(id => !selectedTeamIds.includes(id));
			res.json({
				allTeamIds,
				selectedTeamIds,
				notSelectedTeamIds
			});
		});
	});
});

module.exports = router;
