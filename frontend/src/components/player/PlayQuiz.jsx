
import { useEffect, useState, useRef } from 'react';
import socket from '../../socket';
import DoubleCategorySelector from './DoubleCategorySelector.jsx';

const API_BASE = `http://${window.location.hostname}:3001`;

function PlayQuiz({ sessionId, quizId, teamName: initialTeamName, onBack }) {
  // Double-points category selection
  const [doubleCategoryId, setDoubleCategoryId] = useState(null);
  const [doubleCategoryConfirmed, setDoubleCategoryConfirmed] = useState(false);
  // Try to load persisted state
  const persisted = (() => {
    try {
      const data = localStorage.getItem('playQuizState');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  })();

  const [quiz, setQuiz] = useState(persisted.quiz || null);
  const [teamName, setTeamName] = useState(initialTeamName || '');
  const [currentQuestion, setCurrentQuestion] = useState(persisted.currentQuestion || null);
  const [answers, setAnswers] = useState(persisted.answers || []);
  const [selectedAnswerId, setSelectedAnswerId] = useState(persisted.selectedAnswerId || null);
  const [showResults, setShowResults] = useState(persisted.showResults || false);
  const [loading, setLoading] = useState(true);
  const [quizStarted, setQuizStarted] = useState(persisted.quizStarted || false);
  const [countdown, setCountdown] = useState(persisted.countdown || 0);
  const countdownRef = useRef(null);
  const countdownRunningRef = useRef(false);
  const prevQuestionRef = useRef(null);
  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('playQuizState', JSON.stringify({
        quiz,
        currentQuestion,
        answers,
        selectedAnswerId,
        showResults,
        quizStarted,
        countdown
      }));
    } catch {}
  }, [quiz, currentQuestion, answers, selectedAnswerId, showResults, quizStarted, countdown]);

  useEffect(() => {
    setTeamName(initialTeamName || '');
  }, [initialTeamName]);

  useEffect(() => {
    if (!sessionId || !quizId || !teamName) return;

    const emitJoinRoom = () => {
      console.log('[PlayQuiz] Joining room with teamName:', teamName);
      socket.emit('joinRoom', { quizId, teamName, role: 'player', sessionId });
    };

    // Emit joinRoom on mount and on socket reconnect
    emitJoinRoom();
    socket.on('connect', emitJoinRoom);
    return () => {
      socket.off('connect', emitJoinRoom);
    };
  }, [sessionId, quizId, teamName]);

  useEffect(() => {
    if (!sessionId) return;

    let quizLoadedFromSocket = false;

    const onQuizStarted = () => {
      console.log('[PlayQuiz] Quiz started');
      setQuizStarted(true);
      resetForNewQuestion();
    };

    // Track previous question and answer
    const onNewQuestion = ({ question, answers }) => {
      console.log('[PlayQuiz] New question received:', question);
      // Submit the answer for the previous question, if any
      if (prevQuestionRef.current && prevQuestionRef.current.id && prevQuestionRef.current.selectedAnswerId !== undefined) {
        submitAnswerForQuestion(prevQuestionRef.current, prevQuestionRef.current.selectedAnswerId);
      }
      setCurrentQuestion(question);
      setAnswers(answers);
      setSelectedAnswerId(null);
      setShowResults(false);
      setCountdown(0);
      // Store the new question and clear selectedAnswerId
      prevQuestionRef.current = { ...question, selectedAnswerId: null };
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
      // Always fetch full quiz data so categories are present
      setLoading(true);
      fetch(`${API_BASE}/api/quiz/${newQuizId}/full`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((quizData) => {
          console.log('[PlayQuiz] Loaded quiz data (from socket):', quizData);
          setQuiz(quizData);
          setLoading(false);
        })
        .catch(() => {
          setQuiz({ id: newQuizId, name: quizName });
          setLoading(false);
        });
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
      fetch(`${API_BASE}/api/quiz/${quizId}/full`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((quizData) => {
          console.log('[PlayQuiz] Loaded quiz data:', quizData);
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

  // Accept answerId as argument for correct timing
  const submitAnswerForQuestion = (question, answerId) => {
    if (!question) {
      console.log('[PlayQuiz] No question provided for submit, skipping.');
      return;
    }
    const answerIdToSubmit = answerId !== undefined ? answerId : selectedAnswerId;
    // Support both { id, ... } and { quiz: { id, ... }, categories: [...] }
    const quizIdToUse = quiz?.id || quiz?.quiz?.id;
    console.log('[PlayQuiz] Submitting answer for question:', question.id, {
      sessionId,
      quizId: quizIdToUse,
      questionId: question.id,
      answerId: answerIdToSubmit,
      teamId: socket.id,
    });
    socket.emit('submitAnswer', {
      sessionId,
      quizId: quizIdToUse,
      questionId: question.id,
      answerId: answerIdToSubmit,
      teamId: socket.id,
    });
  };

  const handleAnswer = (answerId) => {
    console.log('[PlayQuiz] Answer selected:', answerId);
    setSelectedAnswerId(answerId);
    // Store the answer with the previous question for submission
    if (prevQuestionRef.current) {
      prevQuestionRef.current.selectedAnswerId = answerId;
    }
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

  // Show double-points selector as a floating option any time after quiz is loaded and before quiz starts
  const showDoubleCategorySelector = quiz.categories && quiz.categories.length > 0 && !quizStarted;

  if (quiz.categories && quiz.categories.length > 0 && !quizStarted) {
    return (
      <div>
        <h2>Quiz Lobby</h2>
        <h3>Welcome Team, <strong>{teamName}</strong>!</h3>
        {/* Categories list removed; categories are visible in the dropdown below */}
        <DoubleCategorySelector
          quiz={quiz}
          sessionId={sessionId}
          doubleCategoryId={doubleCategoryId}
          setDoubleCategoryId={setDoubleCategoryId}
          doubleCategoryConfirmed={doubleCategoryConfirmed}
          setDoubleCategoryConfirmed={setDoubleCategoryConfirmed}
          floating={false}
        />
        <p>⏳ Waiting for the host to start the quiz...</p>
        <button onClick={() => {
          try { localStorage.removeItem('playQuizState'); } catch {}
          onBack();
        }} style={{ marginTop: '1rem' }}>🔙 Back</button>
      </div>
    );
  }

  if (showResults) {
    // Submit the last answer if needed
    if (prevQuestionRef.current && prevQuestionRef.current.id && prevQuestionRef.current.selectedAnswerId !== undefined) {
      submitAnswerForQuestion(prevQuestionRef.current, prevQuestionRef.current.selectedAnswerId);
      prevQuestionRef.current = {};
    }
    return (
      <div>
      <h2>🏁 Quiz Ended!</h2>
      <p>The host will announce the winners.</p>
      <button onClick={() => {
        try { localStorage.removeItem('playQuizState'); } catch {}
        onBack();
      }}>🔙 Back</button>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div>
        <h2>Quiz Lobby</h2>
        <h3>Welcome, <strong>{teamName}</strong>!</h3>
        <p>⏳ Waiting for the host to start the quiz...</p>
        <button onClick={() => {
          try { localStorage.removeItem('playQuizState'); } catch {}
          onBack();
        }} style={{ marginTop: '1rem' }}>🔙 Back</button>
      </div>
    );
  }

  if (!currentQuestion) {
    return <p>Waiting for next question...</p>;
  }
  // Always use backend-sent categoryName for display
  const categoryName = currentQuestion?.categoryName;

  return (
    <div>
      {categoryName && (
        <h3 style={{ marginBottom: 0 }}>Category: <span style={{ color: '#2a5d9f' }}>{categoryName}</span></h3>
      )}
      <h2 style={{ marginTop: categoryName ? 0 : undefined }}>{currentQuestion.text}</h2>
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
