// backend/controllers/doubleCategoryController.js
const db = require('../db/db.js');

// Set or update a team's double-points category for a session
function setDoubleCategory(req, res) {
  const { session_id, team_id, category_id } = req.body;
  if (!session_id || !team_id || !category_id) {
    return res.status(400).json({ error: 'Missing session_id, team_id, or category_id' });
  }
  db.run(
    `INSERT INTO teams_double_category (session_id, team_id, category_id)
     VALUES (?, ?, ?)
     ON CONFLICT(session_id, team_id) DO UPDATE SET category_id=excluded.category_id`,
    [session_id, team_id, category_id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      res.json({ success: true });
    }
  );
}

// Get a team's double-points category for a session
function getDoubleCategory(req, res) {
  const { session_id, team_id } = req.query;
  if (!session_id || !team_id) {
    return res.status(400).json({ error: 'Missing session_id or team_id' });
  }
  db.get(
    'SELECT category_id FROM teams_double_category WHERE session_id = ? AND team_id = ?',
    [session_id, team_id],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      res.json({ category_id: row ? row.category_id : null });
    }
  );
}

module.exports = {
  setDoubleCategory,
  getDoubleCategory
};
