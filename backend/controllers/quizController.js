// Delete a quiz and clean up sessions
export function deleteQuiz(req, res) {
  const { id } = req.params;

  // First, remove from sessions that reference it
  db.run('UPDATE quiz_sessions SET quiz_id = NULL WHERE quiz_id = ?', [id], (err) => {
    if (err) {
      console.error('❌ Failed to null quiz in sessions:', err.message);
      return res.status(500).json({ error: 'Database error during cleanup' });
    }

    // Then delete from quizzes table
    db.run('DELETE FROM quizzes WHERE id = ?', [id], function (err) {
      if (err) {
        console.error('❌ Failed to delete quiz:', err.message);
        return res.status(500).json({ error: 'Database error during delete' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Quiz not found' });
      }
      res.json({ success: true, message: 'Quiz deleted' });
    });
  });
}
// backend/controllers/quizController.js
import db from '../db/db.js';
import { nanoid } from 'nanoid';

export function getAllQuizzes(req, res) {
  db.all('SELECT id, name FROM quizzes ORDER BY name', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
}

export function getQuizById(req, res) {
  const { id } = req.params;
  db.get('SELECT * FROM quizzes WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Quiz not found' });
    res.json(row);
  });
}

export function createQuiz(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing quiz name' });

  const id = nanoid(6).toUpperCase();
  db.run('INSERT INTO quizzes (id, name) VALUES (?, ?)', [id, name], function (err) {
    if (err) {
      console.error('❌ Error inserting quiz:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ id, name });
  });
}
