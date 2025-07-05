// backend/controllers/answerController.js
const db = require('../db/db.js');

function getAnswersByQuestion(req, res) {
  db.all('SELECT * FROM answers WHERE question_id = ?', [req.params.questionId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
}

function createAnswer(req, res) {
  const { question_id, text, is_correct = 0 } = req.body;
  if (!question_id || !text) return res.status(400).json({ error: 'Missing fields' });

  db.run('INSERT INTO answers (question_id, text, is_correct) VALUES (?, ?, ?)', [question_id, text, is_correct ? 1 : 0], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, id: this.lastID });
  });
}

function updateAnswer(req, res) {
  const { text, is_correct } = req.body;
  const fields = [];
  const values = [];

  if (text !== undefined) {
    fields.push('text = ?');
    values.push(text);
  }

  if (is_correct !== undefined) {
    fields.push('is_correct = ?');
    values.push(is_correct ? 1 : 0);
  }

  values.push(req.params.id);
  const sql = `UPDATE answers SET ${fields.join(', ')} WHERE id = ?`;

  db.run(sql, values, function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
}

function deleteAnswer(req, res) {
  db.run('DELETE FROM answers WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
}

module.exports = {
  getAnswersByQuestion,
  createAnswer,
  updateAnswer,
  deleteAnswer
};
