// backend/controllers/fullQuizController.js
const db = require('../db/db.js');

// Returns quiz info, categories, questions, and answers for a quiz
function getFullQuizById(req, res) {
  const { quizId } = req.params;
  db.get('SELECT * FROM quizzes WHERE id = ?', [quizId], (err, quiz) => {
    if (err || !quiz) return res.status(404).json({ error: 'Quiz not found' });

    db.all('SELECT * FROM categories WHERE quiz_id = ?', [quizId], (err, categories) => {
      if (err) return res.status(500).json({ error: 'Database error (categories)' });
      if (!categories) categories = [];

      // For each category, get questions
      const catIds = categories.map(c => c.id);
      if (catIds.length === 0) {
        return res.json({ quiz, categories: [] });
      }
      db.all(`SELECT * FROM questions WHERE category_id IN (${catIds.map(() => '?').join(',')})`, catIds, (err, questions) => {
        if (err) return res.status(500).json({ error: 'Database error (questions)' });
        if (!questions) questions = [];

        // For each question, get answers
        const qIds = questions.map(q => q.id);
        if (qIds.length === 0) {
          // Attach empty questions to categories
          const categoriesWithQuestions = categories.map(cat => ({ ...cat, questions: [] }));
          return res.json({ quiz, categories: categoriesWithQuestions });
        }
        db.all(`SELECT * FROM answers WHERE question_id IN (${qIds.map(() => '?').join(',')})`, qIds, (err, answers) => {
          if (err) return res.status(500).json({ error: 'Database error (answers)' });
          if (!answers) answers = [];

          // Attach answers to questions
          const questionsWithAnswers = questions.map(q => ({
            ...q,
            answers: answers.filter(a => a.question_id === q.id)
          }));

          // Attach questions to categories
          const categoriesWithQuestions = categories.map(cat => ({
            ...cat,
            questions: questionsWithAnswers.filter(q => q.category_id === cat.id)
          }));

          res.json({ quiz, categories: categoriesWithQuestions });
        });
      });
    });
  });
}

module.exports = {
  getFullQuizById
};
