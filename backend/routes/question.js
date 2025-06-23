// backend/routes/question.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/:quizId', (req, res) => {
  db.all('SELECT * FROM questions WHERE quiz_id = ?', [req.params.quizId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { quiz_id, text } = req.body;
  if (!quiz_id || !text) return res.status(400).json({ error: 'Missing quiz_id or question text' });

  db.run('INSERT INTO questions (quiz_id, text) VALUES (?, ?)', [quiz_id, text], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, id: this.lastID, quiz_id, text });
  });
});

router.put('/:id', (req, res) => {
  const { text } = req.body;
  db.run('UPDATE questions SET text = ? WHERE id = ?', [text, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM questions WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
});

export default router;
