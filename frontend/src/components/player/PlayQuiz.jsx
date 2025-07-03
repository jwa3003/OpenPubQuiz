import { useEffect, useState, useRef } from 'react';
import socket from '../../socket';

const API_BASE = `http://${window.location.hostname}:3001`;

function PlayQuiz({ sessionId, quizId, teamName: initialTeamName, onBack }) {
  const [quiz, setQuiz] = useState(null);
  const [teamName, setTeamName] = useState(initialTeamName || '');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [selectedAnswerId, setSelectedAnswerId] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);
  const countdownRunningRef = useRef(false);
  const prevQuestionRef = useRef(null);

  useEffect(() => {
    setTeamName(initialTeamName || '');
  }, [initialTeamName]);

  useEffect(() => {
    if (!sessionId || !quizId || !teamName) return;
    console.log('[PlayQuiz] Joining room with teamName:', teamName);
    socket.emit('joinRoom', { quizId, teamName, role: 'player', sessionId });
  }, [sessionId, quizId, teamName]);

  useEffect(() => {
    if (!sessionId) return;

    let quizLoadedFromSocket = false;

    const onQuizStarted = () => {
      console.log('[PlayQuiz] Quiz started');
      setQuizStarted(true);
      resetForNewQuestion();
    };

    const onNewQuestion = ({ question, answers }) => {
      console.log('[PlayQuiz] New question received:', question);
      if (prevQuestionRef.current) {
        submitAnswerForQuestion(prevQuestionRef.current);
      }
      setCurrentQuestion(question);
      setAnswers(answers);
      setSelectedAnswerId(null);
      setShowResults(false);
      setCountdown(0);
      prevQuestionRef.current = question;
      countdownRunningRef.current = false;
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
        countdownRef.current = null;
      }
    };

    const onCountdown = (seconds) => {
      console.log('[PlayQuiz] Countdown update from server:', seconds);
      setCountdown(seconds);
    };

    const onQuizEnded = () => {
      console.log('[PlayQuiz] Quiz ended');
      submitAnswerForQuestion(currentQuestion);
      setQuizStarted(false);
      setCurrentQuestion(null);
      setAnswers([]);
      setSelectedAnswerId(null);
      setCountdown(0);
      countdownRunningRef.current = false;
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
        countdownRef.current = null;
      }
      setShowResults(true);
    };

    const onQuizLoaded = ({ quizId: newQuizId, quizName }) => {
      console.log(`[PlayQuiz] Quiz loaded dynamically: ${quizName}`);
      setQuiz({ id: newQuizId, name: quizName });
      setLoading(false);
      quizLoadedFromSocket = true;
    };

    socket.on('quiz-started', onQuizStarted);
    socket.on('new-question', onNewQuestion);
    socket.on('countdown', onCountdown);
    socket.on('quiz-ended', onQuizEnded);
    socket.on('quiz-loaded', onQuizLoaded);

    // Only fetch if quiz is not already set by socket event
    if (quizId && !quiz) {
      setLoading(true);
      fetch(`${API_BASE}/api/quiz/${quizId}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((quizData) => {
          // Only set if not already set by socket event
          if (!quizLoadedFromSocket) setQuiz(quizData);
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
      socket.off('quiz-started', onQuizStarted);
      socket.off('new-question', onNewQuestion);
      socket.off('countdown', onCountdown);
      socket.off('quiz-ended', onQuizEnded);
      socket.off('quiz-loaded', onQuizLoaded);
      countdownRunningRef.current = false;
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [sessionId, quizId, currentQuestion, selectedAnswerId, quiz]);

  const submitAnswerForQuestion = (question) => {
    if (!question) {
      console.log('[PlayQuiz] No question provided for submit, skipping.');
      return;
    }

    const answerIdToSubmit = selectedAnswerId !== null ? selectedAnswerId : null;

    console.log('[PlayQuiz] Submitting answer for question:', question.id, {
      sessionId,
      quizId: quiz?.id,
      questionId: question.id,
      answerId: answerIdToSubmit,
      teamId: socket.id,
    });

    socket.emit('submitAnswer', {
      sessionId,
      quizId: quiz?.id,
      questionId: question.id,
      answerId: answerIdToSubmit,
      teamId: socket.id,
    });
  };

  const handleAnswer = (answerId) => {
    console.log('[PlayQuiz] Answer selected:', answerId);
    setSelectedAnswerId(answerId);
    socket.emit('answer-selected', {
      sessionId,
      teamId: socket.id,
    });
  };

  const resetForNewQuestion = () => {
    setSelectedAnswerId(null);
  };

  if (loading) return <p>Loading quiz info...</p>;
  if (!quiz) return <p>Waiting for quiz to be selected...</p>;

  if (showResults) {
    return (
      <div>
      <h2>🏁 Quiz Ended!</h2>
      <p>The host will announce the winners.</p>
      <button onClick={onBack}>🔙 Back</button>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div>
      <h2>{quiz.name}</h2>
      <p>
      Welcome Team, <strong>{teamName}</strong>!
      </p>
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
        cursor: 'pointer',
      }}
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
