// backend/controllers/doubleCategoryStatusController.js
const db = require('../db/db.js');

// Get double-category selection status for all teams in a session
function getDoubleCategoryStatus(req, res) {
  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }
  // Get all teams in the session
  db.all('SELECT team_id FROM quiz_sessions_teams WHERE session_id = ?', [session_id], (err, teamRows) => {
    if (err) {
      console.error('Database error in doubleCategoryStatusController (quiz_sessions_teams):', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    const allTeamIds = teamRows.map(r => r.team_id);
    if (allTeamIds.length === 0) return res.json({ allTeamIds, selectedTeamIds: [], notSelectedTeamIds: [] });
    // Get all teams who have selected a double-category
    db.all('SELECT team_id FROM teams_double_category WHERE session_id = ?', [session_id], (err2, selectedRows) => {
      if (err2) {
        console.error('Database error in doubleCategoryStatusController (teams_double_category):', err2);
        return res.status(500).json({ error: 'Database error', details: err2.message });
      }
      const selectedTeamIds = selectedRows.map(r => r.team_id);
      const notSelectedTeamIds = allTeamIds.filter(id => !selectedTeamIds.includes(id));
      res.json({ allTeamIds, selectedTeamIds, notSelectedTeamIds });
    });
  });

}

module.exports = { getDoubleCategoryStatus };
