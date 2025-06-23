import db from '../db.js';

const timers = new Map(); // Store timers per session

export default function socketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('🔌 New client connected:', socket.id);

        socket.on('joinRoom', ({ sessionId, teamName, role, quizId }) => {
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

                const userName = teamName || (role === 'host' ? 'Host' : 'Team');

                if (role === 'player' && teamName) {
                    io.to(roomId).emit('userJoined', { id: socket.id, name: userName, role });
                }

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

        // Send next question (without starting timer)
        socket.on('next-question', ({ sessionId }) => {
            sendNextQuestion(sessionId);
        });

        // Start countdown timer for the current question
        socket.on('start-timer', ({ sessionId }) => {
            startCountdown(sessionId);
        });

        socket.on('answer-selected', ({ sessionId, playerId }) => {
            if (!sessionId || !playerId) return;
            const roomId = `session-${sessionId}`;
            io.to(roomId).emit('player-selected', { playerId });
        });

        socket.on('submitAnswer', ({ sessionId, quizId, questionId, answerId, playerId }) => {
            if (!sessionId || !quizId || !questionId || !answerId || !playerId) {
                socket.emit('error', { message: 'Missing data for submitAnswer' });
                return;
            }

            const roomId = `session-${sessionId}`;
            io.to(roomId).emit('player-answered', { playerId });
        });

        socket.on('start-quiz', ({ sessionId }) => {
            if (!sessionId) {
                socket.emit('error', { message: 'Missing sessionId for start-quiz' });
                return;
            }

            const roomId = `session-${sessionId}`;
            console.log(`▶️ Quiz starting in room: ${roomId}`);
            io.to(roomId).emit('quiz-started');

            // Reset current_question_index to 0 when starting
            db.run('UPDATE quiz_sessions SET current_question_index = 0 WHERE session_id = ?', [sessionId], (err) => {
                if (err) {
                    console.error('❌ Failed to reset current_question_index:', err);
                    return;
                }
                sendNextQuestion(sessionId);
            });
        });

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);
        });
    });

    function sendNextQuestion(sessionId) {
        const roomId = `session-${sessionId}`;

        // Clear any existing timers
        if (timers.has(sessionId)) {
            clearInterval(timers.get(sessionId));
            timers.delete(sessionId);
        }

        db.get('SELECT quiz_id, current_question_index FROM quiz_sessions WHERE session_id = ?', [sessionId], (err, sessionRow) => {
            if (err || !sessionRow) {
                console.error('❌ Could not fetch quiz session:', err);
                return;
            }

            const quizId = sessionRow.quiz_id;
            let index = sessionRow.current_question_index ?? 0;

            db.all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC', [quizId], (err, questions) => {
                if (err || !questions || index >= questions.length) {
                    console.log('📕 No more questions. Ending quiz.');
                    io.to(roomId).emit('quiz-ended');
                    return;
                }

                const question = questions[index];
                db.all('SELECT * FROM answers WHERE question_id = ?', [question.id], (err, answers) => {
                    if (err) {
                        console.error('❌ Failed to fetch answers:', err.message);
                        return;
                    }

                    io.to(roomId).emit('new-question', { question, answers });

                    // Update current_question_index for next question
                    db.run('UPDATE quiz_sessions SET current_question_index = ? WHERE session_id = ?', [index + 1, sessionId], (err) => {
                        if (err) console.error('❌ Failed to update question index:', err);
                    });
                });
            });
        });
    }

    function startCountdown(sessionId) {
        const roomId = `session-${sessionId}`;
        let timeLeft = 10; // or whatever duration you want

        // Clear any existing timer first
        if (timers.has(sessionId)) {
            clearInterval(timers.get(sessionId));
        }

        io.to(roomId).emit('countdown', timeLeft);

        const timer = setInterval(() => {
            timeLeft -= 1;
            if (timeLeft > 0) {
                io.to(roomId).emit('countdown', timeLeft);
            } else {
                clearInterval(timer);
                timers.delete(sessionId);

                // Auto send next question after countdown ends
                sendNextQuestion(sessionId);
            }
        }, 1000);

        timers.set(sessionId, timer);
    }
}
