// backend/index.js

const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');


const db = require('./db/db.js');
const socketHandlers = require('./sockets/handlers.js');
const { setIO } = require('./utils/socketInstance.js');

const quizRoutes = require('./routes/quiz.js');
const questionRoutes = require('./routes/question.js');
const answerRoutes = require('./routes/answer.js');
const sessionRoutes = require('./routes/session.js');
const categoryRoutes = require('./routes/category.js');
const fullQuizRoutes = require('./routes/fullQuiz.js');

const multer = require('multer');
const path = require('path');
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


// Log every /uploads/ request
app.use('/uploads', (req, res, next) => {
  console.log('[UPLOADS REQUEST]', req.method, req.url, new Date());
  next();
});
// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors());
app.use(express.json());

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_'));
  }
});
const upload = multer({ storage });

// Image upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // Return the public URL to the uploaded file
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

app.use('/api/quiz', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/sessions', sessionRoutes);


const doubleCategoryRoutes = require('./routes/doubleCategory.js');
const doubleCategoryStatusRoutes = require('./routes/doubleCategoryStatus.js');
app.use('/api/categories', categoryRoutes);
app.use('/api/double-category', doubleCategoryRoutes);
app.use('/api/double-category', doubleCategoryStatusRoutes);
app.use('/api/quiz', fullQuizRoutes); // /api/quiz/:quizId/full

const PORT = 3001;
const HOST = '0.0.0.0'; // Listen on all interfaces

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on:`);
  console.log(`   • http://localhost:${PORT}`);

  // Print all local network IPv4 addresses
  try {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    Object.values(interfaces)
      .flat()
      .filter(iface => iface.family === 'IPv4' && !iface.internal)
      .forEach(iface => {
        console.log(`   • http://${iface.address}:${PORT}`);
      });
  } catch (e) {}
});
