// backend/controllers/categoryController.js
import db from '../db/db.js';

export function getCategoriesByQuiz(req, res) {
  const { quizId } = req.params;
  db.all('SELECT * FROM categories WHERE quiz_id = ?', [quizId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
}

export function createCategory(req, res) {
  const { quiz_id, name } = req.body;
  console.log('createCategory called with:', req.body);
  if (!quiz_id || !name) {
    console.error('Missing quiz_id or category name');
    return res.status(400).json({ error: 'Missing quiz_id or category name' });
  }
  db.run('INSERT INTO categories (quiz_id, name) VALUES (?, ?)', [quiz_id, name], function (err) {
    if (err) {
      console.error('DB error in createCategory:', err.message);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json({ success: true, id: this.lastID, quiz_id, name });
  });
}

export function deleteCategory(req, res) {
  db.run('DELETE FROM categories WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
}
