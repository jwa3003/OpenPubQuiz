// backend/index.js
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';

import quizRoutes from './routes/quiz.js';
import questionRoutes from './routes/question.js';
import answerRoutes from './routes/answer.js';
import sessionRoutes from './routes/session.js';
import socketHandlers from './sockets/handlers.js';
import db from './db.js';
import fs from 'fs';

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

// Routes
app.use('/api/quiz', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/sessions', sessionRoutes);

// Initialize DB schema (once, if needed)
fs.readFile('./models/schema.sql', 'utf8', (err, sql) => {
  if (err) {
    console.error('❌ Failed to read schema.sql:', err.message);
  } else {
    db.exec(sql, (err) => {
      if (err) console.error('❌ Failed to execute schema.sql:', err.message);
      else console.log('✅ Schema initialized');
    });
  }
});

// Socket.IO handlers
socketHandlers(io);

// Start server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
