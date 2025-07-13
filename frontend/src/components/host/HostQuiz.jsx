import { useEffect, useState, useRef } from 'react';
import socket from '../../socket';

import Leaderboard from '../common/Leaderboard';
import QuestionDisplay from '../common/QuestionDisplay';
import Timer from '../common/Timer';
import HostStepReview from './HostStepReview';
import HostReviewSummary from './HostReviewSummary';
import FinalLeaderboard from '../common/FinalLeaderboard';



function HostQuiz({ sessionId, quizId, players, onQuizEnd }) {
    const [showCategoryTitle, setShowCategoryTitle] = useState(false);
    const [categoryTitle, setCategoryTitle] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [selectedTeams, setSelectedTeams] = useState(new Set());
    const [countdown, setCountdown] = useState(0);
    const [quizEnded, setQuizEnded] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);
    const [reviewPhase, setReviewPhase] = useState(false);
    const [reviewData, setReviewData] = useState(null);
    const [reviewSummary, setReviewSummary] = useState(null);
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
            setReviewPhase(false);
            setReviewData(null);
            setReviewSummary(null);
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
            setReviewPhase(false);
            setReviewData(null);
            setReviewSummary(null);
            if (countdownRef.current) clearInterval(countdownRef.current);
        });

        socket.on('final-leaderboard', (scores) => {
            setLeaderboard(scores);
        });

        socket.on('score-update', (scores) => {
            setLeaderboard(scores);
        });

        // --- Review Phase events ---
        socket.on('review-phase', (data) => {
            setReviewPhase(true);
            setReviewData(prev => ({ ...data, _nonce: Math.random() }));
        });
        socket.on('review-step', (data) => {
            setReviewPhase(true);
            setReviewData(prev => ({ ...data, _nonce: Math.random() }));
        });
        socket.on('review-ended', () => {
            setReviewPhase(false);
            setReviewData(null);
        });
        socket.on('review-summary', (data) => {
            setReviewPhase(false);
            setReviewData(null);
            setReviewSummary(data.reviewSummary);
        });

        return () => {
            socket.off('new-question');
            socket.off('team-selected');
            socket.off('countdown');
            socket.off('quiz-ended');
            socket.off('final-leaderboard');
            socket.off('score-update');
            socket.off('review-phase');
            socket.off('review-step');
            socket.off('review-ended');
            socket.off('review-summary');
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [sessionId]);

    const handleStartNextQuestion = () => {
        socket.emit('next-question', { sessionId });
    };

    // Host ends the review phase
    const handleEndReview = () => {
        socket.emit('end-review', { sessionId });
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
        if (leaderboard && leaderboard.length > 0) {
            return (
                <>
                    <FinalLeaderboard leaderboard={leaderboard} />
                    <button onClick={onQuizEnd} style={{ marginTop: 32 }}>Back to Dashboard</button>
                </>
            );
        }
        return (
            <div>
                <h2>Quiz Ended</h2>
                <button onClick={onQuizEnd}>Back to Dashboard</button>
            </div>
        );
    }

    // --- Review Phase UI ---
    if (reviewPhase && reviewData && reviewData.reviewQuestion) {
        const { reviewQuestion, reviewIndex, reviewTotal, reviewStep } = reviewData;
        const handleNext = () => socket.emit('next-review-step', { sessionId });
        return (
            <HostStepReview
                reviewQuestion={reviewQuestion}
                reviewIndex={reviewIndex}
                reviewTotal={reviewTotal}
                reviewStep={reviewStep}
                onNext={handleNext}
                onEnd={handleEndReview}
            />
        );
    }

    if (reviewSummary) {
        return <HostReviewSummary reviewSummary={reviewSummary} onEndReview={handleEndReview} />;
    }

    return (
        <div>
            {currentQuestion ? (
                <>
                    <QuestionDisplay question={currentQuestion} />
                    <h4>Teams answered: {teamsAnsweredCount} / {totalTeamsCount}</h4>
                    <Timer countdown={countdown} onStart={handleStartTimer} />
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
            <Leaderboard leaderboard={leaderboard} formatRank={formatRank} />
    </div>
    );
}

export default HostQuiz;
