// backend/sockets/handlers.js
import db from '../db.js';

export default function socketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('⚡ Client connected:', socket.id);

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
            // Optional: persist here later
        });

        socket.on('startTimer', (roomId) => {
            io.to(roomId).emit('timerStarted');
        });

        socket.on('startQuiz', (roomId) => {
            io.to(roomId).emit('startQuiz');
        });

        socket.on('nextQuestion', (roomId) => {
            io.to(roomId).emit('nextQuestion');
        });

        socket.on('disconnect', () => {
            console.log('🔌 Client disconnected:', socket.id);
        });
    });
}
