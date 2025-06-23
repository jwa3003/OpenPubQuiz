// backend/routes/answer.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

// Get all answers for a question
router.get('/:questionId', (req, res) => {
  const questionId = req.params.questionId;
  db.all('SELECT * FROM answers WHERE question_id = ?', [questionId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Add a new answer
router.post('/', (req, res) => {
  const { question_id, text, is_correct = 0 } = req.body;
  if (!question_id || !text) {
    return res.status(400).json({ error: 'Missing question_id or answer text' });
  }

  db.run(
    'INSERT INTO answers (question_id, text, is_correct) VALUES (?, ?, ?)',
         [question_id, text, is_correct ? 1 : 0],
         function (err) {
           if (err) return res.status(500).json({ error: 'Database error' });
           res.json({ success: true, id: this.lastID, question_id, text, is_correct });
         }
  );
});

// Update an answer by ID
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { text, is_correct } = req.body;

  if (typeof text === 'undefined' && typeof is_correct === 'undefined') {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const fields = [];
  const values = [];
  if (typeof text !== 'undefined') {
    fields.push('text = ?');
    values.push(text);
  }
  if (typeof is_correct !== 'undefined') {
    fields.push('is_correct = ?');
    values.push(is_correct ? 1 : 0);
  }
  values.push(id);

  const sql = `UPDATE answers SET ${fields.join(', ')} WHERE id = ?`;
  db.run(sql, values, function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Answer not found' });
    res.json({ success: true });
  });
});

// Delete an answer by ID
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM answers WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Answer not found' });
    res.json({ success: true });
  });
});

export default router;
