// backend/sockets/handlers.js
import db from '../db.js';

export default function socketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('🔌 New client connected:', socket.id);

        socket.on('joinRoom', ({ sessionId, playerName, role, quizId }) => {
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

                // Emit quiz-loaded event to the newly joined socket if session has a quiz
                if (session.quiz_id) {
                    db.get('SELECT * FROM quizzes WHERE id = ?', [session.quiz_id], (err, quiz) => {
                        if (!err && quiz) {
                            socket.emit('quiz-loaded', {
                                quizId: quiz.id,
                                quizName: quiz.name,
                            });
                        }
                    });
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
                            io.to(roomId).emit('new-question', {
                                question,
                                answers,
                            });
                        });
                    }
                );
            });
        });

        // Player has selected an answer (not final)
        socket.on('answer-selected', ({ sessionId, playerId }) => {
            if (!sessionId || !playerId) return;
            const roomId = `session-${sessionId}`;
            // Notify hosts that this player selected an answer
            io.to(roomId).emit('player-selected', { playerId });
        });

        // Player submits the final answer
        socket.on('submitAnswer', ({ sessionId, quizId, questionId, answerId, playerId }) => {
            if (!sessionId || !quizId || !questionId || !answerId || !playerId) {
                socket.emit('error', { message: 'Missing data for submitAnswer' });
                return;
            }

            const roomId = `session-${sessionId}`;

            // TODO: Save the answer to DB here if needed

            // Notify hosts that this player answered (final)
            io.to(roomId).emit('player-answered', { playerId });
        });

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);
        });
    });
}
