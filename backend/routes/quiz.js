// backend/routes/quiz.js
import express from 'express';
import db from '../db.js';
import { nanoid } from 'nanoid';

const router = express.Router();

router.get('/', (req, res) => {
  db.all('SELECT * FROM quizzes', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

router.get('/:id', (req, res) => {
  db.get('SELECT * FROM quizzes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Quiz not found' });
    res.json(row);
  });
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing quiz name' });

  const id = nanoid(6).toUpperCase();
  db.run('INSERT INTO quizzes (id, name) VALUES (?, ?)', [id, name], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.status(201).json({ id, name });
  });
});

export default router;
