require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const quizRoutes = require('./routes/quiz');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/quiz', quizRoutes);

// Root
app.get('/', (req, res) => {
  res.send('OpenPubQuiz API is running');
});

// Start server
app.listen(port, () => {
  console.log(`✅ OpenPubQuiz backend listening on http://localhost:${port}`);
});
