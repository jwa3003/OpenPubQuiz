
// backend/sockets/handlers.js (refactored)
const db = require('../db/db.js');
const { getIO } = require('../utils/socketInstance.js');
const { startCountdown } = require('./timerUtils');
const { emitLeaderboard } = require('./leaderboardUtils');


// === Feature flag for review phase ===
const REVIEW_PHASE_ENABLED = true;

const scores = new Map(); // Map<sessionId, Map<socketId, score>>
const teamNames = new Map(); // Map<socketId, teamName>
const selectedTeamsMap = new Map(); // Map<sessionId, Set<teamId>>
const answeredTeams = new Map(); // Map<sessionId, Set<teamId>>


function sendNextQuestion(sessionId) {
    const io = getIO();
    const roomId = `session-${sessionId}`;


    db.get('SELECT quiz_id, current_question_index FROM quiz_sessions WHERE session_id = ?', [sessionId], (err, sessionRow) => {
        if (err || !sessionRow) {
            console.error('❌ Could not fetch quiz session:', err);
            return;
        }

        const quizId = sessionRow.quiz_id;
        let index = sessionRow.current_question_index ?? 0;

        db.all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC', [quizId], (err, questions) => {
            if (err || !questions || index >= questions.length) {
                if (REVIEW_PHASE_ENABLED) {
                    // Build review summary for all questions in this session from DB
                    db.all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC', [quizId], (err, allQuestions) => {
                        if (err || !allQuestions) return finishQuiz();
                        let reviewSummary = [];
                        let pending = allQuestions.length;
                        allQuestions.forEach((question, qIdx) => {
                            db.all('SELECT * FROM answers WHERE question_id = ?', [question.id], (err, answers) => {
                                const correct = answers && answers.find(a => a.is_correct == 1);
                                const correctAnswerId = correct ? String(correct.id) : null;
                                const correctAnswerText = correct ? correct.text : '';
                                const explanation = question.explanation || '';
                                db.all('SELECT * FROM quiz_review_answers WHERE session_id = ? AND question_id = ?', [sessionId, question.id], (err, teamAnswers) => {
                                    const teamAnswersWithCorrect = (teamAnswers || []).map(ans => ({
                                        teamId: ans.team_id,
                                        teamName: ans.team_name,
                                        answerId: ans.answer_id,
                                        answerText: ans.answer_text,
                                        isCorrect: String(ans.answer_id) === String(correctAnswerId)
                                    }));
                                    reviewSummary[qIdx] = {
                                        questionId: question.id,
                                        questionText: question.text,
                                        correctAnswerId,
                                        correctAnswerText,
                                        explanation,
                                        teamAnswers: teamAnswersWithCorrect
                                    };
                                    pending--;
                                    if (pending === 0) {
                                        // All review data ready, start step-through review
                                        let reviewIndex = 0;
                                        emitCurrentReviewQuestion();
                                        // Register per-socket handlers for review navigation
                                        const registerReviewHandlers = (socket) => {
                                            function handleNextReviewQuestion({ sessionId: stepSessionId }) {
                                                console.log('[REVIEW DEBUG] next-review-question received:', { stepSessionId, sessionId, reviewIndex });
                                                if (stepSessionId !== sessionId) return;
                                                reviewIndex++;
                                                if (reviewIndex < reviewSummary.length) {
                                                    console.log('[REVIEW DEBUG] Advancing to reviewIndex', reviewIndex);
                                                    emitCurrentReviewQuestion();
                                                } else {
                                                    console.log('[REVIEW DEBUG] End of review phase reached, emitting review-ended');
                                                    socket.emit('review-ended');
                                                    db.run('DELETE FROM quiz_review_answers WHERE session_id = ?', [sessionId]);
                                                    finishQuiz();
                                                    socket.off('next-review-question', handleNextReviewQuestion);
                                                    socket.off('end-review', handleEndReview);
                                                }
                                            }
                                            function handleEndReview({ sessionId: endSessionId }) {
                                                console.log('[REVIEW DEBUG] end-review received:', { endSessionId, sessionId });
                                                if (endSessionId !== sessionId) return;
                                                socket.emit('review-ended');
                                                db.run('DELETE FROM quiz_review_answers WHERE session_id = ?', [sessionId]);
                                                finishQuiz();
                                                socket.off('next-review-question', handleNextReviewQuestion);
                                                socket.off('end-review', handleEndReview);
                                            }
                                            socket.on('next-review-question', handleNextReviewQuestion);
                                            socket.on('end-review', handleEndReview);
                                        };
                                        // Register handlers for all currently connected sockets in the room
                                        const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
                                        clients.forEach(socketId => {
                                            const socket = io.sockets.sockets.get(socketId);
                                            if (socket) registerReviewHandlers(socket);
                                        });
                                        function emitCurrentReviewQuestion() {
                                            console.log('[REVIEW DEBUG] Emitting review-phase for reviewIndex', reviewIndex, '/', reviewSummary.length);
                                            if (reviewSummary.length === 0) return finishQuiz();
                                            io.to(roomId).emit('review-phase', {
                                                reviewQuestion: reviewSummary[reviewIndex],
                                                reviewIndex,
                                                reviewTotal: reviewSummary.length
                                            });
                                        }
                                    }
                                });
                            });
                        });
                    });
                } else {
                    finishQuiz();
                }
                function finishQuiz() {
                    emitLeaderboard(sessionId, scores.get(sessionId), teamNames);
                    io.to(roomId).emit('quiz-ended');
                }
                return;
            }

            // --- Normal next question flow ---
            console.log('[REVIEW DEBUG] Normal next question flow, index:', index);
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
                console.log('[REVIEW DEBUG] Answers for question', question.id, ':', JSON.stringify(answers, null, 2));
                db.get('SELECT name FROM categories WHERE id = ?', [question.category_id], (err, catRow) => {
                    const categoryName = catRow ? catRow.name : '';
                    const emitQuestion = () => {
                        io.to(roomId).emit('new-question', { question: { ...question, categoryName }, answers });
                        db.run('UPDATE quiz_sessions SET current_question_index = ? WHERE session_id = ?', [index + 1, sessionId], (err) => {
                            if (err) console.error('❌ Failed to update question index:', err);
                        });
                        // No longer needed: review answers are now stored in DB
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

function socketHandlers() {
    module.exports = socketHandlers;
    const io = getIO();

    io.on('connection', (socket) => {
        // Step-through review phase: now handled in sendNextQuestion using DB, no in-memory state needed here
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

                    db.run(
                        `INSERT OR IGNORE INTO quiz_sessions_teams (session_id, team_id, team_name) VALUES (?, ?, ?)`,
                        [sessionId, socket.id, teamName]
                    );

                    if (!scores.has(sessionId)) scores.set(sessionId, new Map());
                    if (!scores.get(sessionId).has(socket.id)) scores.get(sessionId).set(socket.id, 0);
                }

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


        // Helper: On timer end, auto-submit missing answers, then advance
        function autoSubmitMissingAnswersAndAdvance(sessionId) {
            const io = getIO();
            const roomId = `session-${sessionId}`;
            db.get('SELECT quiz_id, current_question_index FROM quiz_sessions WHERE session_id = ?', [sessionId], (err, sessionRow) => {
                if (err || !sessionRow) return sendNextQuestion(sessionId);
                const quizId = sessionRow.quiz_id;
                let index = sessionRow.current_question_index ?? 0;
                db.all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC', [quizId], (err, questions) => {
                    if (err || !questions || index >= questions.length) return sendNextQuestion(sessionId);
                    const question = questions[index];
                    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
                    const playerIds = clients.filter(id => teamNames.has(id));
                    const answered = answeredTeams.get(sessionId) || new Set();
                    const missingTeamIds = playerIds.filter(id => !answered.has(id));
                    if (missingTeamIds.length === 0) {
                        sendNextQuestion(sessionId);
                        return;
                    }
                    // Auto-submit null/empty answers for missing teams
                    let pending = missingTeamIds.length;
                    missingTeamIds.forEach(teamId => {
                        // Insert a null/empty answer for review phase
                        db.run(
                            `INSERT INTO quiz_review_answers (session_id, question_id, team_id, team_name, answer_id, answer_text) VALUES (?, ?, ?, ?, ?, ?)`,
                            [sessionId, question.id, teamId, teamNames.get(teamId) || 'Unknown', null, ''],
                            () => {
                                if (!answeredTeams.has(sessionId)) answeredTeams.set(sessionId, new Set());
                                answeredTeams.get(sessionId).add(teamId);
                                io.to(roomId).emit('team-answered', { teamId });
                                pending--;
                                if (pending === 0) {
                                    sendNextQuestion(sessionId);
                                }
                            }
                        );
                    });
                });
            });
        }

        socket.on('start-timer', ({ sessionId }) => {
            startCountdown(sessionId, 5, () => autoSubmitMissingAnswersAndAdvance(sessionId));
        });

        socket.on('answer-selected', ({ sessionId, teamId }) => {
            if (!sessionId || !teamId) return;
            const roomId = `session-${sessionId}`;
            if (!selectedTeamsMap.has(sessionId)) selectedTeamsMap.set(sessionId, new Set());
            selectedTeamsMap.get(sessionId).add(teamId);
            io.to(roomId).emit('team-selected', { teamId });

            const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
            const playerIds = clients.filter(id => teamNames.has(id));
            const selected = selectedTeamsMap.get(sessionId);
            if (selected && playerIds.every(id => selected.has(id)) && playerIds.length > 0) {
                console.log('[AUTO-TIMER] All teams have selected, starting timer!');
                startCountdown(sessionId, 5, () => sendNextQuestion(sessionId));
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

            if (!answeredTeams.has(sessionId)) answeredTeams.set(sessionId, new Set());
            answeredTeams.get(sessionId).add(teamId);
            console.log('[SUBMIT DEBUG] submitAnswer received:', { sessionId, teamId });
            console.log('[SUBMIT DEBUG] answeredTeams for session:', Array.from(answeredTeams.get(sessionId)));

            // Store answer for review phase in persistent DB table
            db.get('SELECT text FROM answers WHERE id = ?', [answerId], (err, answerRow) => {
                const answerText = answerRow ? answerRow.text : '';
                db.run(
                    `INSERT INTO quiz_review_answers (session_id, question_id, team_id, team_name, answer_id, answer_text) VALUES (?, ?, ?, ?, ?, ?)`,
                    [sessionId, questionId, teamId, teamNames.get(teamId) || 'Unknown', answerId, answerText]
                );
            });

            // After storing, check if all teams have submitted and all answers are present
            db.all('SELECT id FROM quiz_sessions WHERE session_id = ?', [sessionId], (err, sessionRows) => {
                if (err || !sessionRows || sessionRows.length === 0) return;
                const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
                const playerIds = clients.filter(id => teamNames.has(id));
                const answered = answeredTeams.get(sessionId);
                if (REVIEW_PHASE_ENABLED && answered && playerIds.every(id => answered.has(id)) && playerIds.length > 0) {
                    // All teams have submitted, ready for review phase
                    sendNextQuestion(sessionId);
                }
            });

            db.get('SELECT q.category_id, a.is_correct FROM questions q JOIN answers a ON a.question_id = q.id WHERE a.id = ?', [answerId], (err, row) => {
                if (err || !row) return;

                if (row.is_correct == 1) {
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

            db.all('SELECT id FROM quiz_sessions WHERE session_id = ?', [sessionId], (err, sessionRows) => {
                if (err || !sessionRows || sessionRows.length === 0) return;
                const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
                const playerIds = clients.filter(id => teamNames.has(id));
                const answered = answeredTeams.get(sessionId);
                if (answered && playerIds.every(id => answered.has(id)) && playerIds.length > 0) {
                    // Accumulate review summary for the just-answered question (index = current_question_index)
                    db.get('SELECT quiz_id, current_question_index FROM quiz_sessions WHERE session_id = ?', [sessionId], (err, sessionRow) => {
                        if (err || !sessionRow) return;
                        const quizId = sessionRow.quiz_id;
                        let index = sessionRow.current_question_index ?? 0;
                        db.all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC', [quizId], (err, questions) => {
                            if (err || !questions || index > questions.length) return;
                            // The just-answered question is questions[index]
                            const question = questions[index];
                            db.all('SELECT * FROM answers WHERE question_id = ?', [question.id], (err, answers) => {
                                if (err || !answers) return;
                                const correct = answers.find(a => a.is_correct == 1);
                                const correctAnswerId = correct ? String(correct.id) : null;
                                const correctAnswerText = correct ? correct.text : '';
                                const explanation = question.explanation || '';
                                if (!reviewSummaryBySession.has(sessionId)) reviewSummaryBySession.set(sessionId, []);
                                const summaryArr = reviewSummaryBySession.get(sessionId);
                                const alreadyIncluded = summaryArr.some(q => q.questionId === question.id);
                                if (!alreadyIncluded) {
                                    const reviewAnswers = teamAnswersForReview.get(sessionId) || [];
                                    const teamAnswersWithCorrect = reviewAnswers.map(ans => {
                                        const isCorrect = String(ans.answerId) === String(correctAnswerId);
                                        return {
                                            ...ans,
                                            isCorrect
                                        };
                                    });
                                    summaryArr.push({
                                        questionId: question.id,
                                        questionText: question.text,
                                        correctAnswerId,
                                        correctAnswerText,
                                        explanation,
                                        teamAnswers: teamAnswersWithCorrect
                                    });
                                    reviewSummaryBySession.set(sessionId, summaryArr);
                                    console.log('[REVIEW DEBUG] Added to reviewSummary for session', sessionId, JSON.stringify(summaryArr, null, 2));
                                }
                            });
                        });
                    });
                    // Now, advance to next question or review phase
                    if (REVIEW_PHASE_ENABLED) {
                        // Listen for end-review from host
                        socket.on('end-review', ({ sessionId: endSessionId }) => {
                            if (endSessionId !== sessionId) return;
                            io.to(roomId).emit('review-ended');
                            // Reset for next question
                            answeredTeams.set(sessionId, new Set());
                            teamAnswersForReview.set(sessionId, []);
                            sendNextQuestion(sessionId);
                        });
                    } else {
                        startCountdown(sessionId, 5, () => sendNextQuestion(sessionId));
                        answeredTeams.set(sessionId, new Set());
                    }
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
}

module.exports = socketHandlers;
                    // Fetch the category name for this question
