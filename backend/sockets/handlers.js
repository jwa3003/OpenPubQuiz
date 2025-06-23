// backend/sockets/handlers.js
import db from '../db.js';

export default function socketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('🔌 New client connected:', socket.id);

        socket.on('joinRoom', ({ sessionId, playerName, role }) => {
            if (!sessionId) {
                socket.emit('error', { message: 'Missing sessionId' });
                return;
            }

            const roomId = `session-${sessionId}`;
            db.get('SELECT * FROM quiz_sessions WHERE session_id = ?', [sessionId], (err, session) => {
                if (err || !session) {
                    socket.emit('error', { message: 'Invalid sessionId' });
                    return;
                }

                socket.join(roomId);
                console.log(`✅ ${socket.id} joined ${roomId}`);

                const userName = playerName || (role === 'host' ? 'Host' : 'Player');

                if (role === 'player' && playerName) {
                    io.to(roomId).emit('userJoined', { id: socket.id, name: userName, role });
                }
            });
        });

        socket.on('start-quiz', ({ sessionId }) => {
            if (!sessionId) {
                socket.emit('error', { message: 'Missing sessionId for start-quiz' });
                return;
            }

            const roomId = `session-${sessionId}`;
            console.log(`▶️ Quiz starting in room: ${roomId}`);

            io.to(roomId).emit('quiz-started');

            db.get('SELECT quiz_id FROM quiz_sessions WHERE session_id = ?', [sessionId], (err, sessionRow) => {
                if (err || !sessionRow) {
                    console.error('❌ Could not fetch quiz_id for session:', err);
                    return;
                }

                const quizId = sessionRow.quiz_id;
                if (!quizId) {
                    console.warn('⚠️ No quiz_id found for session', sessionId);
                    return;
                }

                db.get(
                    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC LIMIT 1',
                    [quizId],
                    (err, question) => {
                        if (err || !question) {
                            console.error('❌ No questions found:', err?.message);
                            return;
                        }

                        db.all('SELECT * FROM answers WHERE question_id = ?', [question.id], (err, answers) => {
                            if (err) {
                                console.error('❌ Failed to fetch answers:', err.message);
                                return;
                            }

                            console.log(`✅ Sending first question: "${question.text}" with ${answers.length} answers`);
                            io.to(roomId).emit('first-question', {
                                question,
                                answers,
                            });
                        });
                    }
                );
            });
        });

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);
        });
    });
}
