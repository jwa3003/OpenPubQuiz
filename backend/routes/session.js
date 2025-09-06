
const express = require('express');
const { createSession, getSessionById, updateSession, removeQuizFromSession } = require('../controllers/sessionController.js');

const router = express.Router();

router.post('/', createSession);
router.get('/:session_id', getSessionById);
router.put('/:session_id', updateSession);
router.delete('/:session_id/quiz', removeQuizFromSession);

// Get all teams for a session
router.get('/:session_id/teams', (req, res) => {
	const db = require('../db/db.js');
	const { session_id } = req.params;
	db.all('SELECT team_id as id, team_name as name FROM quiz_sessions_teams WHERE session_id = ?', [session_id], (err, rows) => {
		if (err) return res.status(500).json({ error: 'Database error' });
		res.json({ teams: rows });
	});
});

module.exports = router;
