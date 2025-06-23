import { useEffect, useState, useRef } from 'react';
import socket from '../socket';

function HostQuiz({ sessionId, quizId, players, onQuizEnd }) {
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [selectedPlayers, setSelectedPlayers] = useState(new Set());
    const [countdown, setCountdown] = useState(0);
    const [quizEnded, setQuizEnded] = useState(false);
    const countdownRef = useRef(null);

    useEffect(() => {
        if (!sessionId) return;

        socket.on('new-question', ({ question, answers }) => {
            setCurrentQuestion(question);
            setAnswers(answers);
            setSelectedPlayers(new Set());
            setQuizEnded(false);
            setCountdown(0);
            if (countdownRef.current) clearInterval(countdownRef.current);
        });

            socket.on('player-selected', ({ playerId }) => {
                setSelectedPlayers((prev) => {
                    const newSet = new Set(prev);
                    newSet.add(playerId);
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

                return () => {
                    socket.off('new-question');
                    socket.off('player-selected');
                    socket.off('countdown');
                    socket.off('quiz-ended');
                    if (countdownRef.current) clearInterval(countdownRef.current);
                };
    }, [sessionId]);

    const handleStartNextQuestion = () => {
        socket.emit('next-question', { sessionId });
    };

    const handleStartTimer = () => {
        socket.emit('start-timer', { sessionId });
    };

    const playersAnsweredCount = selectedPlayers.size;
    const totalPlayersCount = players.length;

    if (quizEnded) {
        return (
            <div>
            <h2>Quiz Ended</h2>
            <button onClick={onQuizEnd}>Back to Dashboard</button>
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div>
            <h3>Waiting for next question...</h3>
            <button onClick={handleStartNextQuestion} disabled={countdown > 0}>
            {countdown > 0 ? `Next question in ${countdown}s` : 'Next Question'}
            </button>
            <p>Players answered: {playersAnsweredCount} / {totalPlayersCount}</p>
            </div>
        );
    }

    return (
        <div>
        <h3>Current Question</h3>
        <p><strong>{currentQuestion.text}</strong></p>

        <h4>Players answered: {playersAnsweredCount} / {totalPlayersCount}</h4>

        <button onClick={handleStartTimer} disabled={countdown > 0}>
        {countdown > 0 ? `Next question in ${countdown}s` : 'Next Question'}
        </button>
        </div>
    );
}

export default HostQuiz;
