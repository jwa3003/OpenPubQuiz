// backend/index.js
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');

const db = require('./db.js');
const socketHandlers = require('./sockets/handlers.js');
const { setIO } = require('./utils/socketInstance.js');

const quizRoutes = require('./routes/quiz.js');
const fullQuizRoutes = require('./routes/fullQuiz.js');
const uploadRoutes = require('./routes/upload.js');
const categoryRoutes = require('./routes/category.js');
const questionRoutes = require('./routes/question.js');
const answerRoutes = require('./routes/answer.js');
const sessionRoutes = require('./routes/session.js');

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
app.use('/api/quiz', fullQuizRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/categories', categoryRoutes); // Alias for legacy/frontend compatibility
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/sessions', sessionRoutes);
const doubleCategoryRoutes = require('./routes/doubleCategory.js');
const doubleCategoryStatusRoutes = require('./routes/doubleCategoryStatus.js');
app.use('/api/double-category', doubleCategoryRoutes);
app.use('/api/double-category', doubleCategoryStatusRoutes);

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
