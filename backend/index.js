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
  db.run(`
    CREATE TABLE IF NOT EXISTS quiz_sessions (
      session_id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'waiting',
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
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
    if (!row) return res.status(404).json({ error: 'Quiz not found' });
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

// ➕ Create a new question for a quiz
app.post('/api/questions', (req, res) => {
  const { quiz_id, text } = req.body;
  if (!quiz_id || !text) {
    return res.status(400).json({ error: 'Missing quiz_id or question text' });
  }
  db.run(
    'INSERT INTO questions (quiz_id, text) VALUES (?, ?)',
    [quiz_id, text],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true, id: this.lastID, quiz_id, text });
    }
  );
});

// 📝 Update a question by ID
app.put('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing question text' });

  db.run(
    'UPDATE questions SET text = ? WHERE id = ?',
    [text, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Question not found' });
      res.json({ success: true });
    }
  );
});

// ❌ Delete a question by ID
app.delete('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM questions WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Question not found' });
    res.json({ success: true });
  });
});

// ➕ Create a new answer for a question
app.post('/api/answers', (req, res) => {
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

// 📝 Update an answer by ID
app.put('/api/answers/:id', (req, res) => {
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

// ❌ Delete an answer by ID
app.delete('/api/answers/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM answers WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Answer not found' });
    res.json({ success: true });
  });
});

// ➕ Create a new quiz session
app.post('/api/sessions', (req, res) => {
  const { session_id, quiz_id } = req.body;
  if (!session_id || !quiz_id) {
    return res.status(400).json({ error: 'Missing session_id or quiz_id' });
  }

  db.get('SELECT * FROM quizzes WHERE id = ?', [quiz_id], (err, quiz) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    db.run(
      'INSERT INTO quiz_sessions (session_id, quiz_id) VALUES (?, ?)',
      [session_id, quiz_id],
      function (err) {
        if (err) {
          console.error('❌ Failed to insert quiz session:', err.message);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, session_id, quiz_id });
      }
    );
  });
});

// Get session info by session_id
app.get('/api/sessions/:session_id', (req, res) => {
  const { session_id } = req.params;
  db.get('SELECT * FROM quiz_sessions WHERE session_id = ?', [session_id], (err, session) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  });
});

// Update session status
app.put('/api/sessions/:session_id', (req, res) => {
  const { session_id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Missing status' });

  db.run(
    'UPDATE quiz_sessions SET status = ? WHERE session_id = ?',
    [status, session_id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Session not found' });
      res.json({ success: true });
    }
  );
});

// ✅ Socket.IO
io.on('connection', (socket) => {
  console.log('⚡ New client connected:', socket.id);

  socket.on('joinRoom', ({ sessionId, playerName, role }) => {
    if (!sessionId) {
      socket.emit('error', { message: 'Missing sessionId' });
      return;
    }

    db.get('SELECT * FROM quiz_sessions WHERE session_id = ?', [sessionId], (err, session) => {
      if (err || !session) {
        socket.emit('error', { message: 'Invalid sessionId' });
        return;
      }

      const roomId = `session-${sessionId}`;
      socket.join(roomId);
      console.log(`🧑 ${socket.id} joined room ${roomId}`);

      if (role === 'player' && playerName) {
        io.to(roomId).emit('userJoined', { id: socket.id, name: playerName });
      }
    });
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
