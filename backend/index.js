// backend/index.js
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';

import db from './db/db.js';
import socketHandlers from './sockets/handlers.js';
import { setIO } from './utils/socketInstance.js';


import quizRoutes from './routes/quiz.js';
import questionRoutes from './routes/question.js';
import answerRoutes from './routes/answer.js';
import sessionRoutes from './routes/session.js';
import categoryRoutes from './routes/category.js';
import fullQuizRoutes from './routes/fullQuiz.js';

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

// Register socket event handlers WITHOUT passing io, since handlers will get it internally
socketHandlers();

app.use(cors());
app.use(express.json());

app.use('/api/quiz', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/quiz', fullQuizRoutes); // /api/quiz/:quizId/full

const PORT = 3001;
const HOST = '0.0.0.0'; // Listen on all interfaces

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on:`);
  console.log(`   • http://localhost:${PORT}`);

  import('os').then(os => {
    const interfaces = os.networkInterfaces();
    Object.values(interfaces)
    .flat()
    .filter(iface => iface.family === 'IPv4' && !iface.internal)
    .forEach(iface => {
      console.log(`   • http://${iface.address}:${PORT}`);
    });
  });
});
