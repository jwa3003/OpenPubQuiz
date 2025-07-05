

import { useEffect, useState, useRef } from 'react';
import socket from '../../socket';



function HostQuiz({ sessionId, quizId, players, onQuizEnd }) {
    const [showCategoryTitle, setShowCategoryTitle] = useState(false);
    const [categoryTitle, setCategoryTitle] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [selectedTeams, setSelectedTeams] = useState(new Set());
    const [countdown, setCountdown] = useState(0);
    const [quizEnded, setQuizEnded] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);
    const countdownRef = useRef(null);

    useEffect(() => {
        if (!sessionId) return;

        socket.on('category-title', ({ categoryName }) => {
            setCategoryTitle(categoryName);
            setShowCategoryTitle(true);
            setTimeout(() => setShowCategoryTitle(false), 5000);
        });

        socket.on('new-question', ({ question, answers }) => {
            setCurrentQuestion(question);
            setAnswers(answers);
            setSelectedTeams(new Set());
            setQuizEnded(false);
            setCountdown(0);
            if (countdownRef.current) clearInterval(countdownRef.current);
        });

            socket.on('team-selected', ({ teamId }) => {
                setSelectedTeams((prev) => {
                    const newSet = new Set(prev);
                    newSet.add(teamId);
                    return newSet;
                });
            });

            socket.on('countdown', (seconds) => {
                setCountdown(seconds);
                if (countdownRef.current) clearInterval(countdownRef.current);
                let timeLeft = seconds;
                countdownRef.current = setInterval(() => {
                    timeLeft -= 1;
                    setCountdown(timeLeft);
                    if (timeLeft <= 0) clearInterval(countdownRef.current);
                }, 1000);
            });

            socket.on('quiz-ended', () => {
                setQuizEnded(true);
                setCurrentQuestion(null);
                setAnswers([]);
                setCountdown(0);
                if (countdownRef.current) clearInterval(countdownRef.current);
            });

                socket.on('final-leaderboard', (scores) => {
                    setLeaderboard(scores);
                });

                socket.on('score-update', (scores) => {
                    setLeaderboard(scores);
                });

                return () => {
                    socket.off('new-question');
                    socket.off('team-selected');
                    socket.off('countdown');
                    socket.off('quiz-ended');
                    socket.off('final-leaderboard');
                    socket.off('score-update');
                    if (countdownRef.current) clearInterval(countdownRef.current);
                };
    }, [sessionId]);

    const handleStartNextQuestion = () => {
        socket.emit('next-question', { sessionId });
    };


    // Host can manually start timer at any time
    const handleStartTimer = () => {
        socket.emit('start-timer', { sessionId });
    };

    const teamsAnsweredCount = selectedTeams.size;
    const totalTeamsCount = players ? players.length : 0;

    const formatRank = (rank) => {
        if (rank === 1) return '🥇 1st';
        if (rank === 2) return '🥈 2nd';
        if (rank === 3) return '🥉 3rd';
        const suffix = ['th', 'st', 'nd', 'rd'];
        const v = rank % 100;
        const suffixText = suffix[(v - 20) % 10] || suffix[v] || suffix[0];
        return `${rank}${suffixText}`;
    };

    if (showCategoryTitle) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #181c24 0%, #232a36 100%)', color: '#fff',
                fontSize: '2.5rem', fontWeight: 700, letterSpacing: 1
            }}>
                <div style={{ fontSize: '1.2rem', opacity: 0.7, marginBottom: 8 }}>Category</div>
                <div style={{
                    fontWeight: 900,
                    fontSize: '2.7rem',
                    marginTop: 12,
                    textShadow: '0 2px 16px #000a',
                    textAlign: 'center',
                    width: '90vw',
                    maxWidth: 500,
                    wordBreak: 'break-word',
                    lineHeight: 1.15,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>{categoryTitle}</div>
            </div>
        );
    }
    if (quizEnded) {
        return (
            <div>
            <h2>🏁 Quiz Ended</h2>
            {leaderboard.length > 0 && (
                <>
                <h3>🏆 Final Leaderboard</h3>
                <ol style={{ listStyleType: 'none', paddingLeft: 0 }}>
                {leaderboard.map((entry, index) => (
                    <li key={`${entry.teamName}-${index}`}>
                    {formatRank(index + 1)} {entry.teamName} with {entry.score} point{entry.score !== 1 ? 's' : ''}
                    </li>
                ))}
                </ol>
                </>
            )}
            <button onClick={onQuizEnd}>🔙 Back to Dashboard</button>
            </div>
        );
    }

    return (
        <div>
        {currentQuestion ? (
            <>
            <h3>Current Question</h3>
            <p><strong>{currentQuestion.text}</strong></p>

            <h4>Teams answered: {teamsAnsweredCount} / {totalTeamsCount}</h4>

            <button onClick={handleStartTimer} disabled={countdown > 0}>
            {countdown > 0 ? `Next question in ${countdown}s` : 'Start Timer (Force Next)'}
            </button>
            </>
        ) : (
            <div>
            <h3>Waiting for next question...</h3>
            <button onClick={handleStartNextQuestion} disabled={countdown > 0}>
            {countdown > 0 ? `Next question in ${countdown}s` : 'Next Question'}
            </button>
            <p>Teams answered: {teamsAnsweredCount} / {totalTeamsCount}</p>
            </div>
        )}

        {leaderboard.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
            <h4>📊 Live Leaderboard</h4>
            <ol style={{ listStyleType: 'none', paddingLeft: 0 }}>
            {leaderboard.map((entry, index) => (
                <li key={`${entry.teamName}-${index}`}>
                {formatRank(index + 1)} {entry.teamName} with {entry.score} point{entry.score !== 1 ? 's' : ''}
                </li>
            ))}
            </ol>
            </div>
        )}
        </div>
    );
}

export default HostQuiz;
