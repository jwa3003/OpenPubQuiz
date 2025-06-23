// backend/routes/question.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

// Get all questions for a quiz
router.get('/:quizId', (req, res) => {
  const quizId = req.params.quizId;
  db.all('SELECT * FROM questions WHERE quiz_id = ?', [quizId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Add a new question to a quiz
router.post('/', (req, res) => {
  const { quiz_id, text } = req.body;
  if (!quiz_id || !text) {
    return res.status(400).json({ error: 'Missing quiz_id or question text' });
  }

  db.run('INSERT INTO questions (quiz_id, text) VALUES (?, ?)', [quiz_id, text], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, id: this.lastID, quiz_id, text });
  });
});

// Update a question by ID
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing question text' });

  db.run('UPDATE questions SET text = ? WHERE id = ?', [text, id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Question not found' });
    res.json({ success: true });
  });
});

// Delete a question by ID
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM questions WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Question not found' });
    res.json({ success: true });
  });
});

export default router;
