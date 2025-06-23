// backend/index.js
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';

import db from './db.js';
import socketHandlers from './sockets/handlers.js';
import { setIO } from './socketInstance.js';

import quizRoutes from './routes/quiz.js';
import questionRoutes from './routes/question.js';
import answerRoutes from './routes/answer.js';
import sessionRoutes from './routes/session.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Make the Socket.IO instance available globally
setIO(io);

// Register socket event handlers
socketHandlers(io);

// Middleware
app.use(cors());
app.use(express.json());

// REST API routes
app.use('/api/quiz', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/sessions', sessionRoutes);

// Start the server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
