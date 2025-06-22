import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { Server } from 'socket.io';
import http from 'http';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// SQLite setup
const db = new sqlite3.Database('./quiz.db', (err) => {
  if (err) console.error('Failed to connect to DB:', err.message);
  else console.log('Connected to SQLite DB.');
});

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id TEXT NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      is_correct INTEGER DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);
});

// ➕ Create a new quiz
app.post('/api/quiz', (req, res) => {
  let { id, name } = req.body;
  console.log('📩 Creating quiz with body:', req.body);

  id = String(id);
  name = String(name);

  if (!id || !name) {
    return res.status(400).json({ error: 'Missing quiz id or name' });
  }

  db.run(
    'INSERT INTO quizzes (id, name) VALUES (?, ?)',
    [id, name],
    function (err) {
      if (err) {
        console.error('❌ Failed to insert quiz:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, id, name });
    }
  );
});

// 📋 Get all quizzes
app.get('/api/quiz', (req, res) => {
  db.all('SELECT * FROM quizzes', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// 🔍 Get quiz by ID
app.get('/api/quiz/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM quizzes WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'quiz not found' });
    res.json(row);
  });
});

// ❓ Get questions by quiz ID
app.get('/api/questions/:quizId', (req, res) => {
  const { quizId } = req.params;
  db.all('SELECT * FROM questions WHERE quiz_id = ?', [quizId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// 💬 Get answers by question ID
app.get('/api/answers/:questionId', (req, res) => {
  const { questionId } = req.params;
  db.all('SELECT * FROM answers WHERE question_id = ?', [questionId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// ✅ Socket.IO
io.on('connection', (socket) => {
  console.log('⚡ New client connected:', socket.id);

  socket.on('joinRoom', ({ quizId, playerName, role }) => {
    const roomId = `quiz-${quizId}`;
    socket.join(roomId);
    console.log(`🧑 ${socket.id} joined room ${roomId}`);

    // If a player joins, notify the host(s) in that room
    if (role === 'player' && playerName) {
      io.to(roomId).emit('userJoined', { id: socket.id, name: playerName });
    }
  });

  socket.on('submitAnswer', (data) => {
    console.log('📩 Answer submitted:', data);
  });

  socket.on('startTimer', (roomId) => {
    io.to(roomId).emit('timerStarted');
  });

  socket.on('nextQuestion', (roomId) => {
    io.to(roomId).emit('nextQuestion');
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});
