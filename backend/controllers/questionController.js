// backend/controllers/questionController.js
const db = require('../db/db.js');

function getQuestionsByQuiz(req, res) {
  db.all('SELECT * FROM questions WHERE quiz_id = ?', [req.params.quizId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
}

function createQuestion(req, res) {
  const { quiz_id, text, category_id, image_url } = req.body;
  console.log('createQuestion called with:', req.body);
  if (!quiz_id || !text || !category_id) {
    console.error('Missing quiz_id, question text, or category_id');
    return res.status(400).json({ error: 'Missing quiz_id, question text, or category_id' });
  }
  db.run('INSERT INTO questions (quiz_id, text, category_id, image_url) VALUES (?, ?, ?, ?)', [quiz_id, text, category_id, image_url || null], function (err) {
    if (err) {
      console.error('DB error in createQuestion:', err.message);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json({ success: true, id: this.lastID, quiz_id, text, category_id, image_url });
  });
}

function updateQuestion(req, res) {
  const { text, image_url } = req.body;
  db.run('UPDATE questions SET text = ?, image_url = ? WHERE id = ?', [text, image_url || null, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
}

function deleteQuestion(req, res) {
  db.run('DELETE FROM questions WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
}

module.exports = {
  getQuestionsByQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion
};
