// backend/sockets/handlers.js

const db = require('../db/db.js');
const { getIO } = require('../utils/socketInstance.js');

const timers = new Map(); // Store timers per session
const scores = new Map(); // Map<sessionId, Map<socketId, score>>
const teamNames = new Map(); // Map<socketId, teamName>


// Track which teams have selected an answer for the current question (shared across all sockets)
const selectedTeamsMap = new Map(); // Map<sessionId, Set<teamId>>
// Track which teams have answered for the current question (shared across all sockets)
const answeredTeams = new Map(); // Map<sessionId, Set<teamId>>

function socketHandlers() {
    module.exports = socketHandlers;
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

                    // Insert team into quiz_sessions_teams if not already present
                    db.run(
                        `INSERT OR IGNORE INTO quiz_sessions_teams (session_id, team_id, team_name) VALUES (?, ?, ?)`,
                        [sessionId, socket.id, teamName]
                    );

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

        // Track which teams have selected an answer for the current question (for UI and auto-timer)
        socket.on('answer-selected', ({ sessionId, teamId }) => {
            if (!sessionId || !teamId) return;
            const roomId = `session-${sessionId}`;
            if (!selectedTeamsMap.has(sessionId)) selectedTeamsMap.set(sessionId, new Set());
            selectedTeamsMap.get(sessionId).add(teamId);
            io.to(roomId).emit('team-selected', { teamId });

            // Auto-timer: check if all teams have selected
            const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
            const playerIds = clients.filter(id => teamNames.has(id));
            const selected = selectedTeamsMap.get(sessionId);
            if (selected && playerIds.every(id => selected.has(id)) && playerIds.length > 0) {
                console.log('[AUTO-TIMER] All teams have selected, starting timer!');
                startCountdown(sessionId, 5); // 5 second timer
                // Reset for next question
                selectedTeamsMap.set(sessionId, new Set());
            }
        });



        socket.on('submitAnswer', ({ sessionId, quizId, questionId, answerId, teamId }) => {
            if (!sessionId || !quizId || !questionId || (answerId === undefined) || !teamId) {
                socket.emit('error', { message: 'Missing data for submitAnswer' });
                return;
            }

            const roomId = `session-${sessionId}`;
            io.to(roomId).emit('team-answered', { teamId });

            // Track answers for this question
            if (!answeredTeams.has(sessionId)) answeredTeams.set(sessionId, new Set());
            answeredTeams.get(sessionId).add(teamId);
            console.log('[SUBMIT DEBUG] submitAnswer received:', { sessionId, teamId });
            console.log('[SUBMIT DEBUG] answeredTeams for session:', Array.from(answeredTeams.get(sessionId)));

            // Need to get the question's category_id for double-points logic
            db.get('SELECT q.category_id, a.is_correct FROM questions q JOIN answers a ON a.question_id = q.id WHERE a.id = ?', [answerId], (err, row) => {
                if (err || !row) return;

                // is_correct may be 0/1 as integer, so check with == 1
                if (row.is_correct == 1) {
                    // Check if this team has selected this category for double points
                    db.get('SELECT category_id FROM teams_double_category WHERE session_id = ? AND team_id = ?', [sessionId, teamId], (err, doubleRow) => {
                        let points = 1;
                        if (!err && doubleRow && Number(doubleRow.category_id) === Number(row.category_id)) {
                            points = 2;
                        }

                        console.log(`✅ Correct answer from ${teamNames.get(teamId)}! (${points} point${points > 1 ? 's' : ''})`);

                        if (!scores.has(sessionId)) scores.set(sessionId, new Map());

                        const sessionScores = scores.get(sessionId);
                        const prev = sessionScores.get(teamId) || 0;
                        sessionScores.set(teamId, prev + points);

                        console.log(`🎯 ${teamNames.get(teamId)} now has ${prev + points} point(s)`);

                        // Emit live leaderboard update
                        const partialLeaderboard = Array.from(sessionScores.entries())
                        .map(([id, score]) => ({
                            teamName: teamNames.get(id) || 'Unknown',
                            score,
                        }))
                        .sort((a, b) => b.score - a.score);

                        io.to(roomId).emit('score-update', partialLeaderboard);
                    });
                } else {
                    console.log(`❌ Incorrect answer from ${teamNames.get(teamId)}`);
                }
            });

            // Check if all teams have answered (auto-timer logic)
            db.all('SELECT id FROM quiz_sessions WHERE session_id = ?', [sessionId], (err, sessionRows) => {
                if (err || !sessionRows || sessionRows.length === 0) return;
                // Get all team IDs in the room
                const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
                const playerIds = clients.filter(id => teamNames.has(id));
                const answered = answeredTeams.get(sessionId);
                if (answered && playerIds.every(id => answered.has(id)) && playerIds.length > 0) {
                    console.log('[AUTO-TIMER] All teams have submitted answers, starting timer!');
                    startCountdown(sessionId, 5); // 5 second timer
                    // Reset for next question
                    answeredTeams.set(sessionId, new Set());
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

                // Determine if this is the first question of a new category
                let isFirstInCategory = true;
                if (index > 0) {
                    const prevCategoryId = questions[index - 1].category_id;
                    if (prevCategoryId === question.category_id) {
                        isFirstInCategory = false;
                    }
                }

                db.all('SELECT * FROM answers WHERE question_id = ?', [question.id], (err, answers) => {
                    if (err) {
                        console.error('❌ Failed to fetch answers:', err.message);
                        return;
                    }

                    // Fetch the category name for this question
                    db.get('SELECT name FROM categories WHERE id = ?', [question.category_id], (err, catRow) => {
                        const categoryName = catRow ? catRow.name : '';
                        const emitQuestion = () => {
                            io.to(roomId).emit('new-question', { question: { ...question, categoryName }, answers });
                            db.run('UPDATE quiz_sessions SET current_question_index = ? WHERE session_id = ?', [index + 1, sessionId], (err) => {
                                if (err) console.error('❌ Failed to update question index:', err);
                            });
                        };
                        if (isFirstInCategory) {
                            io.to(roomId).emit('category-title', { categoryName });
                            setTimeout(emitQuestion, 5000); // Show for 5 seconds
                        } else {
                            emitQuestion();
                        }
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

    function startCountdown(sessionId, seconds = 5) {
        const io = getIO();
        const roomId = `session-${sessionId}`;
        let timeLeft = seconds;

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

module.exports = socketHandlers;
