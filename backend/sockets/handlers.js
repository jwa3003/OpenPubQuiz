
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


    console.log(`[DEBUG] sendNextQuestion called for sessionId=${sessionId}`);
    db.get('SELECT quiz_id, current_question_index FROM quiz_sessions WHERE session_id = ?', [sessionId], (err, sessionRow) => {
        if (err || !sessionRow) {
            console.error('❌ Could not fetch quiz session:', err);
            return;
        }

        const quizId = sessionRow.quiz_id;
        let index = sessionRow.current_question_index ?? 0;
        console.log(`[DEBUG] Current question index: ${index}`);
        if (sendNextQuestion._skipCategoryReviewOnce) {
            console.log(`[DEBUG] skipCategoryReviewOnce flag:`, sendNextQuestion._skipCategoryReviewOnce[sessionId]);
        }

        db.all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC', [quizId], (err, questions) => {
            // If quiz is finished (index >= questions.length), show review for all questions if enabled
            if (err || !questions || index >= questions.length) {
                // --- END OF QUIZ: review all questions ---
                if (REVIEW_PHASE_ENABLED && questions && questions.length > 0) {
                    // Prevent further next-question after quiz end
                    if (sendNextQuestion._quizEndedForSession && sendNextQuestion._quizEndedForSession[sessionId]) {
                        return;
                    }
                    if (!sendNextQuestion._quizEndedForSession) sendNextQuestion._quizEndedForSession = {};
                    sendNextQuestion._quizEndedForSession[sessionId] = true;
                    // Find the first and last question indices for the last category
                    const lastQuestion = questions[questions.length - 1];
                    let firstIdx = questions.length - 1;
                    while (firstIdx > 0 && questions[firstIdx - 1].category_id === lastQuestion.category_id) {
                        firstIdx--;
                    }
                    let lastIdx = questions.length - 1;
                    triggerReviewPhase(questions, firstIdx, lastIdx, sessionId, roomId, () => {
                        emitLeaderboard(sessionId, scores.get(sessionId), teamNames, true); // FINAL leaderboard
                        io.to(roomId).emit('quiz-ended');
                    });
                } else {
                    emitLeaderboard(sessionId, scores.get(sessionId), teamNames, true); // FINAL leaderboard
                    io.to(roomId).emit('quiz-ended');
                }
                return;
            }

            // --- Normal next question flow ---
            if (index < questions.length) {
                console.log('[REVIEW DEBUG] Normal next question flow, index:', index);
                // Detect if this is the last question in a category
                const currentQuestion = questions[index];
                let isLastInCategory = true;
                if (index < questions.length - 1) {
                    const nextCategoryId = questions[index + 1].category_id;
                    if (nextCategoryId === currentQuestion.category_id) {
                        isLastInCategory = false;
                    }
                } else {
                    // If this is the last question in the quiz, check if it's also the last in its category
                    isLastInCategory = true;
                }

                // After the last question in a category, trigger review for that category
                // Only trigger review after the last question in a category has been ANSWERED and about to ADVANCE
                // So, check if the PREVIOUS question was the last in its category
                if (!sendNextQuestion._skipCategoryReviewOnce) sendNextQuestion._skipCategoryReviewOnce = {};
                if (REVIEW_PHASE_ENABLED && index > 0 && !sendNextQuestion._skipCategoryReviewOnce[sessionId]) {
                    console.log(`[DEBUG] About to check for category review, index=${index}, skipCategoryReviewOnce=${sendNextQuestion._skipCategoryReviewOnce[sessionId]}`);
                    console.log(`[REVIEW DEBUG] Checking for category review: index=${index}, sessionId=${sessionId}`);
                    const prevQuestion = questions[index - 1];
                    let prevIsLastInCategory = true;
                    if (index < questions.length) {
                        const thisCategoryId = currentQuestion.category_id;
                        if (thisCategoryId === prevQuestion.category_id) {
                            prevIsLastInCategory = false;
                        }
                    }
                    if (prevIsLastInCategory) {
                        console.log(`[REVIEW DEBUG] Triggering category review for previous category, sessionId=${sessionId}`);
                        // Find the first and last question indices for the previous category
                        let firstIdx = index - 1;
                        while (firstIdx > 0 && questions[firstIdx - 1].category_id === prevQuestion.category_id) {
                            firstIdx--;
                        }
                        let lastIdx = index - 1;
                        console.log(`[DEBUG] Triggering triggerReviewPhase for category review, firstIdx=${firstIdx}, lastIdx=${lastIdx}`);
                        triggerReviewPhase(questions, firstIdx, lastIdx, sessionId, roomId, () => {
                            // After review, emit CURRENT leaderboard, then WAIT for host to continue (do NOT auto-advance)
                            emitLeaderboard(sessionId, scores.get(sessionId), teamNames, false); // CURRENT leaderboard
                            console.log(`[REVIEW DEBUG] Setting skipCategoryReviewOnce for sessionId=${sessionId}`);
                            sendNextQuestion._skipCategoryReviewOnce[sessionId] = true;
                            console.log(`[DEBUG] After category review, skipCategoryReviewOnce now:`, sendNextQuestion._skipCategoryReviewOnce[sessionId]);
                            // DO NOT call sendNextQuestion here; wait for host to emit 'next-question'.
                        });
                        return;
                    }
                }

                // Reset skip flag after skipping once, but only if we are NOT about to trigger another review
                if (sendNextQuestion._skipCategoryReviewOnce[sessionId]) {
                    // Only reset if we are not about to trigger another review (i.e., not at a category boundary)
                    if (index < questions.length && (
                        index === 0 || questions[index].category_id === questions[index - 1].category_id
                    )) {
                        console.log(`[REVIEW DEBUG] Skipping category review for sessionId=${sessionId} and resetting flag.`);
                        sendNextQuestion._skipCategoryReviewOnce[sessionId] = false;
                        console.log(`[DEBUG] skipCategoryReviewOnce flag reset for sessionId=${sessionId}`);
                    }
                }

                // --- Emit the next question ---
                db.all('SELECT * FROM answers WHERE question_id = ?', [currentQuestion.id], (err, answers) => {
                    console.log('[REVIEW DEBUG] Answers for question', currentQuestion.id, ':', JSON.stringify(answers, null, 2));
                    db.get('SELECT name, image_url FROM categories WHERE id = ?', [currentQuestion.category_id], (err, catRow) => {
                        const categoryName = catRow ? catRow.name : '';
                        const categoryImageUrl = catRow ? catRow.image_url : null;
                        const emitQuestion = () => {
                            io.to(roomId).emit('new-question', { question: { ...currentQuestion, categoryName }, answers });
                            db.run('UPDATE quiz_sessions SET current_question_index = ? WHERE session_id = ?', [index + 1, sessionId], (err) => {
                                if (err) console.error('❌ Failed to update question index:', err);
                            });
                            // No longer needed: review answers are now stored in DB
                        };
                        // Define isFirstInCategory: true if first question or category changed from previous
                        const isFirstInCategory = (index === 0) || (questions[index].category_id !== questions[index - 1].category_id);
                        if (isFirstInCategory) {
                            io.to(roomId).emit('category-title', { categoryName, categoryImageUrl });
                            setTimeout(emitQuestion, 5000); // Show for 5 seconds
                        } else {
                            emitQuestion();
                        }
                    });
                });
            }
        });
    });
// Helper to trigger review phase for a range of questions (inclusive)
function triggerReviewPhase(questions, firstIdx, lastIdx, sessionId, roomId, onComplete) {
    const io = getIO();
    let reviewSummary = [];
    let pending = lastIdx - firstIdx + 1;
    for (let qIdx = firstIdx; qIdx <= lastIdx; qIdx++) {
        const question = questions[qIdx];
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
                // Ensure image_url is a full public path if present and not already absolute
                let imageUrl = question.image_url;
                if (imageUrl && !/^https?:\/\//.test(imageUrl) && !imageUrl.startsWith('/uploads/')) {
                  imageUrl = '/uploads/' + imageUrl.replace(/^.*[\\\/]/, '');
                }
                reviewSummary[qIdx - firstIdx] = {
                    questionId: question.id,
                    questionText: question.text,
                    image_url: imageUrl,
                    correctAnswerId,
                    correctAnswerText,
                    explanation,
                    teamAnswers: teamAnswersWithCorrect,
                    allAnswers: answers ? answers.map(a => ({ id: a.id, text: a.text })) : []
                };
                pending--;
                if (pending === 0) {
                    // All review data ready, start backend-driven step-by-step review
                    let reviewState = {
                        reviewIndex: 0, // which question
                        reviewStep: 0    // which step within question (0=show Q&A, 1=highlight correct, 2=show team results)
                    };
                    function emitCurrentReviewStep() {
                        if (reviewSummary.length === 0) return onComplete && onComplete();
                        const { reviewIndex, reviewStep } = reviewState;
                        const reviewQuestion = reviewSummary[reviewIndex];
                        io.to(roomId).emit('review-step', {
                            reviewQuestion,
                            reviewIndex,
                            reviewTotal: reviewSummary.length,
                            reviewStep // 0=show Q&A, 1=highlight correct, 2=show team results
                        });
                    }
                    // Register per-socket handlers for review navigation
                    let reviewEnded = false;
                    const registerReviewStepHandlers = (socket) => {
                        function handleNextReviewStep({ sessionId: stepSessionId }) {
                            if (stepSessionId !== sessionId || reviewEnded) return;
                            reviewState.reviewStep++;
                            // 3 steps: 0=show Q&A, 1=highlight correct, 2=show team results
                            if (reviewState.reviewStep > 2) {
                                reviewState.reviewStep = 0;
                                reviewState.reviewIndex++;
                                if (reviewState.reviewIndex >= reviewSummary.length) {
                                    // End of review phase: emit leaderboard and then WAIT for host to advance
                                    // CATEGORY END: emit current leaderboard (not final) and review-ended
                                    const io = getIO();
                                    const sessionScores = scores.get(sessionId);
                                    if (sessionScores) {
                                        const leaderboard = Array.from(sessionScores.entries())
                                            .map(([teamId, score]) => ({
                                                teamId,
                                                teamName: teamNames.get(teamId) || 'Unknown',
                                                score,
                                            }))
                                            .sort((a, b) => b.score - a.score);
                                        io.to(roomId).emit('current-leaderboard', leaderboard);
                                    }
                                    io.to(roomId).emit('review-ended');
                                    db.run('DELETE FROM quiz_review_answers WHERE session_id = ?', [sessionId]);
                                    reviewEnded = true;
                                    // Set skipCategoryReviewOnce flag and call onComplete so next-question advances
                                    if (!sendNextQuestion._skipCategoryReviewOnce) sendNextQuestion._skipCategoryReviewOnce = {};
                                    sendNextQuestion._skipCategoryReviewOnce[sessionId] = true;
                                    if (onComplete) onComplete();
                                    socket.off('next-review-step', handleNextReviewStep);
                                    socket.off('end-review', handleEndReview);
                                    return;
                                }
                            }
                            emitCurrentReviewStep();
                        }
                        function handleEndReview({ sessionId: endSessionId }) {
                            if (endSessionId !== sessionId || reviewEnded) return;
                            const { emitLeaderboard } = require('./leaderboardUtils');
                            emitLeaderboard(sessionId, scores.get(sessionId), teamNames, true); // FINAL leaderboard
                            io.to(roomId).emit('review-ended');
                            db.run('DELETE FROM quiz_review_answers WHERE session_id = ?', [sessionId]);
                            reviewEnded = true;
                            // DO NOT call onComplete here! Wait for explicit next-question event from host
                            socket.off('next-review-step', handleNextReviewStep);
                            socket.off('end-review', handleEndReview);
                        }
                        socket.on('next-review-step', handleNextReviewStep);
                        socket.on('end-review', handleEndReview);
                    };
                    // Register handlers for all currently connected sockets in the room
                    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
                    clients.forEach(socketId => {
                        const socket = io.sockets.sockets.get(socketId);
                        if (socket) registerReviewStepHandlers(socket);
                    });
                    // Start review at step 0 of first question
                    emitCurrentReviewStep();
                }
            });
        });
    }
}
}

function socketHandlers() {
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

                // --- PATCH: Re-register review step handlers for host if review is in progress ---
                // This ensures host can always control review phase after reconnect/reload
                if (role === 'host') {
                    // Check if a review is in progress for this session
                    db.get('SELECT quiz_id, current_question_index FROM quiz_sessions WHERE session_id = ?', [sessionId], (err, sessionRow) => {
                        if (err || !sessionRow) return;
                        const quizId = sessionRow.quiz_id;
                        db.all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC', [quizId], (err, questions) => {
                            if (err || !questions || questions.length === 0) return;
                            // Check if review answers exist for this session (review in progress)
                            db.get('SELECT COUNT(*) as cnt FROM quiz_review_answers WHERE session_id = ?', [sessionId], (err, row) => {
                                if (err || !row || row.cnt === 0) return;
                                // Re-register review step handlers for this host socket
                                // (copy of registerReviewStepHandlers logic)
                                function handleNextReviewStep({ sessionId: stepSessionId }) {
                                    if (stepSessionId !== sessionId) return;
                                    // This will be handled by the main reviewState in sendNextQuestion
                                    // Just emit a debug log for now
                                    console.log(`[REVIEW DEBUG] Host ${socket.id} emitted next-review-step for session ${sessionId}`);
                                }
                                function handleEndReview({ sessionId: endSessionId }) {
                                    if (endSessionId !== sessionId) return;
                                    console.log(`[REVIEW DEBUG] Host ${socket.id} emitted end-review for session ${sessionId}`);
                                }
                                socket.on('next-review-step', handleNextReviewStep);
                                socket.on('end-review', handleEndReview);
                                console.log(`[REVIEW DEBUG] Registered review step handlers for host ${socket.id} on joinRoom`);
                            });
                        });
                    });
                }
            });
        });

        socket.on('next-question', ({ sessionId }) => {
            console.log(`[FRONTEND DEBUG] Received 'next-question' from host (socket ${socket.id}) for session ${sessionId}`);
            if (!sendNextQuestion._skipCategoryReviewOnce) sendNextQuestion._skipCategoryReviewOnce = {};
            // If we are at a category boundary (i.e., just finished a review), set the skip flag for this session
            const sessionRoom = `session-${sessionId}`;
            const clients = Array.from(getIO().sockets.adapter.rooms.get(sessionRoom) || []);
            // Check if a leaderboard was just emitted (i.e., review just ended)
            // We'll use a simple heuristic: if the leaderboard was just emitted, set the skip flag
            if (!sendNextQuestion._skipCategoryReviewOnce[sessionId]) {
                console.log(`[DEBUG] Setting skipCategoryReviewOnce flag to true for sessionId=${sessionId}`);
                sendNextQuestion._skipCategoryReviewOnce[sessionId] = true;
            } else {
                console.log(`[DEBUG] skipCategoryReviewOnce was true for sessionId=${sessionId}, resetting to false and skipping category review logic.`);
                sendNextQuestion._skipCategoryReviewOnce[sessionId] = false;
            }
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
            const timerUtils = require('./timerUtils');
            // Only start the timer if it isn't already running for this session
            if (
                selected &&
                playerIds.every(id => selected.has(id)) &&
                playerIds.length > 0 &&
                !timerUtils.timers.has(sessionId)
            ) {
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
