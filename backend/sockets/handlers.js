// backend/sockets/handlers.js
import db from '../db/db.js';
import { getIO } from '../utils/socketInstance.js';

const timers = new Map(); // Store timers per session
const scores = new Map(); // Map<sessionId, Map<socketId, score>>
const teamNames = new Map(); // Map<socketId, teamName>

export default function socketHandlers() {
    const io = getIO();

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
                    io.to(roomId).emit('teamJoined', { id: socket.id, name: userName, role });

                    teamNames.set(socket.id, teamName);

                    if (!scores.has(sessionId)) scores.set(sessionId, new Map());
                    if (!scores.get(sessionId).has(socket.id)) scores.get(sessionId).set(socket.id, 0);
                }

                // Emit quiz-loaded event with quizId and quizName
                const activeQuizId = quizId || session.quiz_id;
                if (activeQuizId) {
                    db.get('SELECT * FROM quizzes WHERE id = ?', [activeQuizId], (err, quiz) => {
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

        socket.on('next-question', ({ sessionId }) => {
            sendNextQuestion(sessionId);
        });

        socket.on('start-timer', ({ sessionId }) => {
            startCountdown(sessionId);
        });

        socket.on('answer-selected', ({ sessionId, teamId }) => {
            if (!sessionId || !teamId) return;
            const roomId = `session-${sessionId}`;
            io.to(roomId).emit('team-selected', { teamId });
        });

        socket.on('submitAnswer', ({ sessionId, quizId, questionId, answerId, teamId }) => {
            if (!sessionId || !quizId || !questionId || (answerId === undefined) || !teamId) {
                socket.emit('error', { message: 'Missing data for submitAnswer' });
                return;
            }

            const roomId = `session-${sessionId}`;
            io.to(roomId).emit('team-answered', { teamId });

            db.get('SELECT is_correct FROM answers WHERE id = ?', [answerId], (err, answer) => {
                if (err || !answer) return;

                if (answer.is_correct) {
                    console.log(`✅ Correct answer from ${teamNames.get(teamId)}!`);

                    if (!scores.has(sessionId)) scores.set(sessionId, new Map());

                    const sessionScores = scores.get(sessionId);
                    const prev = sessionScores.get(teamId) || 0;
                    sessionScores.set(teamId, prev + 1);

                    console.log(`🎯 ${teamNames.get(teamId)} now has ${prev + 1} point(s)`);

                    // Emit live leaderboard update
                    const partialLeaderboard = Array.from(sessionScores.entries())
                    .map(([id, score]) => ({
                        teamName: teamNames.get(id) || 'Unknown',
                                           score,
                    }))
                    .sort((a, b) => b.score - a.score);

                    io.to(roomId).emit('score-update', partialLeaderboard);
                } else {
                    console.log(`❌ Incorrect answer from ${teamNames.get(teamId)}`);
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
            teamNames.delete(socket.id);
            for (const sessionScores of scores.values()) {
                sessionScores.delete(socket.id);
            }
        });
    });

    function sendNextQuestion(sessionId) {
        const io = getIO();
        const roomId = `session-${sessionId}`;

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
                    emitLeaderboard(sessionId);
                    io.to(roomId).emit('quiz-ended');
                    return;
                }

                const question = questions[index];
                db.all('SELECT * FROM answers WHERE question_id = ?', [question.id], (err, answers) => {
                    if (err) {
                        console.error('❌ Failed to fetch answers:', err.message);
                        return;
                    }

                    // Fetch the category name for this question
                    db.get('SELECT name FROM categories WHERE id = ?', [question.category_id], (err, catRow) => {
                        const categoryName = catRow ? catRow.name : '';
                        io.to(roomId).emit('new-question', { question: { ...question, categoryName }, answers });

                        db.run('UPDATE quiz_sessions SET current_question_index = ? WHERE session_id = ?', [index + 1, sessionId], (err) => {
                            if (err) console.error('❌ Failed to update question index:', err);
                        });
                    });
                });
            });
        });
    }

    function emitLeaderboard(sessionId) {
        const io = getIO();
        const sessionScores = scores.get(sessionId);
        if (!sessionScores) return;

        const leaderboard = Array.from(sessionScores.entries())
        .map(([teamId, score]) => ({
            teamName: teamNames.get(teamId) || 'Unknown',
                                   score,
        }))
        .sort((a, b) => b.score - a.score);

        const roomId = `session-${sessionId}`;
        io.to(roomId).emit('final-leaderboard', leaderboard);
        console.log('🏁 Final leaderboard:', leaderboard);
    }

    function startCountdown(sessionId) {
        const io = getIO();
        const roomId = `session-${sessionId}`;
        let timeLeft = 10;

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
                sendNextQuestion(sessionId);
            }
        }, 1000);

        timers.set(sessionId, timer);
    }
}
