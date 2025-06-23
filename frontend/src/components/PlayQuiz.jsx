import { useEffect, useState, useRef } from 'react';
import socket from '../socket';

function PlayQuiz({ sessionId, quizId, onBack }) {
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [selectedAnswerId, setSelectedAnswerId] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);
  const answerSubmittedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    socket.emit('joinRoom', { quizId, playerName: null, role: 'player', sessionId });

    socket.on('quiz-started', () => {
      setQuizStarted(true);
      resetForNewQuestion();
    });

    socket.on('new-question', ({ question, answers }) => {
      setCurrentQuestion(question);
      setAnswers(answers);
      setSelectedAnswerId(null);
      setShowResults(false);
      setCountdown(0);
      answerSubmittedRef.current = false;
      if (countdownRef.current) clearInterval(countdownRef.current);
    });

      socket.on('countdown', (seconds) => {
        setCountdown(seconds);
        if (countdownRef.current) clearInterval(countdownRef.current);
        let timeLeft = seconds;

        countdownRef.current = setInterval(() => {
          timeLeft -= 1;
          setCountdown(timeLeft);

          if (timeLeft <= 0) {
            clearInterval(countdownRef.current);
            submitAnswerIfNotSubmitted();
          }
        }, 1000);
      });

      socket.on('quiz-ended', () => {
        setQuizStarted(false);
        setCurrentQuestion(null);
        setAnswers([]);
        setSelectedAnswerId(null);
        setShowResults(true);
        setCountdown(0);
        answerSubmittedRef.current = false;
        if (countdownRef.current) clearInterval(countdownRef.current);
      });

        socket.on('quiz-loaded', ({ quizId: newQuizId, quizName }) => {
          console.log(`🧠 Quiz loaded dynamically: ${quizName}`);
          setQuiz({ id: newQuizId, name: quizName });
          setLoading(false);
        });

        if (quizId) {
          fetch(`http://localhost:3001/api/quiz/${quizId}`)
          .then((res) => (res.ok ? res.json() : Promise.reject()))
          .then((quizData) => {
            setQuiz(quizData);
            setLoading(false);
          })
          .catch(() => {
            setQuiz(null);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }

        return () => {
          socket.off('quiz-started');
          socket.off('new-question');
          socket.off('countdown');
          socket.off('quiz-ended');
          socket.off('quiz-loaded');
          if (countdownRef.current) clearInterval(countdownRef.current);
        };
  }, [sessionId, quizId]);

  const resetForNewQuestion = () => {
    setSelectedAnswerId(null);
    answerSubmittedRef.current = false;
  };

  const submitAnswerIfNotSubmitted = () => {
    if (!answerSubmittedRef.current && selectedAnswerId !== null) {
      socket.emit('submitAnswer', {
        sessionId,
        quizId: quiz?.id,
        questionId: currentQuestion.id,
        answerId: selectedAnswerId,
        playerId: socket.id,
      });
      answerSubmittedRef.current = true;
    }
  };

  const handleAnswer = (answerId) => {
    if (answerSubmittedRef.current) return;
    setSelectedAnswerId(answerId);
    socket.emit('answer-selected', {
      sessionId,
      playerId: socket.id,
    });
  };

  if (loading) return <p>Loading quiz info...</p>;
  if (!quiz) return <p>Waiting for quiz to be selected...</p>;

  if (showResults) {
    return (
      <div>
      <h2>Quiz ended. Thanks for playing!</h2>
      <button onClick={onBack}>Back</button>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div>
      <h2>{quiz.name}</h2>
      <p>⏳ Waiting for the host to start the quiz...</p>
      </div>
    );
  }

  if (!currentQuestion) {
    return <p>Waiting for next question...</p>;
  }

  return (
    <div>
    <h2>{quiz.name}</h2>
    <h3>{currentQuestion.text}</h3>
    <ul style={{ listStyle: 'none', padding: 0 }}>
    {answers.map((ans) => (
      <li key={ans.id} style={{ marginBottom: '0.5rem' }}>
      <button
      onClick={() => handleAnswer(ans.id)}
      style={{
        padding: '0.5rem 1rem',
        backgroundColor: selectedAnswerId === ans.id ? 'lightgreen' : '#f0f0f0',
        color: '#000',
        border: '1px solid #ccc',
        cursor: answerSubmittedRef.current ? 'not-allowed' : 'pointer',
      }}
      disabled={answerSubmittedRef.current}
      >
      {ans.text || '(no text)'}
      </button>
      </li>
    ))}
    </ul>
    <p style={{ marginTop: '1rem' }}>
    {countdown > 0
      ? `⏳ Time remaining: ${countdown} second${countdown === 1 ? '' : 's'}`
      : '🕒 Waiting for next question...'}
      </p>
      </div>
  );
}

export default PlayQuiz;
