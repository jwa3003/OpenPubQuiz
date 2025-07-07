

import { useEffect, useState, useRef } from 'react';
import socket from '../../socket';
import DoubleCategorySelector from './DoubleCategorySelector.jsx';
import QuestionDisplay from '../common/QuestionDisplay';
import PlayerReviewSummary from './PlayerReviewSummary';
import PlayerStepReview from './PlayerStepReview';
import Timer from '../common/Timer';
import AnswerList from '../common/AnswerList';

const API_BASE = `http://${window.location.hostname}:3001`;

function PlayQuiz({ sessionId, quizId, teamName: initialTeamName, onBack }) {
  const [showCategoryTitle, setShowCategoryTitle] = useState(false);
  const [categoryTitle, setCategoryTitle] = useState('');
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
  const answerSubmittedRef = useRef(false);
  // Review phase state
  const [reviewPhase, setReviewPhase] = useState(false);
  const [reviewData, setReviewData] = useState(null);
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
      // Reset answerSubmittedRef for new question
      answerSubmittedRef.current = false;
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
      // When timer hits 0, auto-submit answer for current question if not already submitted
      if (seconds === 0 && !answerSubmittedRef.current) {
        // Use the latest selected answer at timer end
        if (currentQuestion && selectedAnswerId !== null) {
          submitAnswerForQuestion(currentQuestion, selectedAnswerId);
          answerSubmittedRef.current = true;
        }
      }
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
    socket.on('timer-ended', () => {
      // Timer ended, submit answer for current question (even if countdown event missed)
      if (!answerSubmittedRef.current && currentQuestion && selectedAnswerId !== null) {
        submitAnswerForQuestion(currentQuestion, selectedAnswerId);
      }
    });
    socket.on('quiz-ended', onQuizEnded);
    socket.on('quiz-loaded', onQuizLoaded);
    socket.on('category-title', ({ categoryName }) => {
      setCategoryTitle(categoryName);
      setShowCategoryTitle(true);
      setTimeout(() => setShowCategoryTitle(false), 5000);
    });

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
      socket.off('timer-ended');
    };
  }, [sessionId, quizId, currentQuestion, selectedAnswerId, quiz]);

  // Accept answerId as argument for correct timing
  const submitAnswerForQuestion = (question, answerId) => {
    if (!question) {
      console.log('[PlayQuiz] No question provided for submit, skipping.');
      return;
    }
    if (answerSubmittedRef.current) {
      console.log('[PlayQuiz] Answer already submitted for this question, skipping.');
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
    answerSubmittedRef.current = true;
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
    // Do NOT submit answer here; only submit when timer hits zero
  };

  const resetForNewQuestion = () => {
    setSelectedAnswerId(null);
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

  // --- Review Phase UI ---
  if (reviewPhase && reviewData && reviewData.reviewQuestion) {
    const { reviewQuestion, reviewIndex, reviewTotal } = reviewData;
    return <PlayerStepReview reviewQuestion={reviewQuestion} reviewIndex={reviewIndex} reviewTotal={reviewTotal} currentTeamId={socket.id} />;
  }
  if (reviewPhase && reviewData && reviewData.reviewSummary) {
    return <PlayerReviewSummary reviewSummary={reviewData.reviewSummary} currentTeamId={socket.id} />;
  }
  // If reviewData is present but not reviewSummary, fallback to old single-question review for compatibility
  if (reviewPhase && reviewData && reviewData.allTeamAnswers) {
    const myAnswer = reviewData.allTeamAnswers.find(ans => ans.teamId === socket.id);
    return (
      <div style={{ padding: 24, background: '#232a36', color: '#fff', borderRadius: 12, maxWidth: 700, margin: '2rem auto' }}>
        <h2>Review Phase</h2>
        <QuestionDisplay question={{ ...currentQuestion, ...reviewData }} />
        <h3>Correct Answer:</h3>
        <div style={{ fontWeight: 700, color: '#4caf50', fontSize: '1.3rem', marginBottom: 12 }}>{reviewData.correctAnswerText}</div>
        {reviewData.explanation && (
          <div style={{ marginBottom: 16, fontStyle: 'italic', color: '#b3e5fc' }}>{reviewData.explanation}</div>
        )}
        <h4>Your Answer:</h4>
        <div style={{ color: myAnswer?.answerId === reviewData.correctAnswerId ? '#4caf50' : '#f44336', fontWeight: 600, fontSize: '1.1rem' }}>
          {myAnswer ? myAnswer.answerText : <em>No answer submitted</em>}
        </div>
        <p style={{ marginTop: 24, color: '#bbb' }}><em>Waiting for the host to continue...</em></p>
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
      <QuestionDisplay question={currentQuestion} />
      <AnswerList answers={answers} selectedAnswerId={selectedAnswerId} onSelect={handleAnswer} />
      <Timer countdown={countdown} />
      <p style={{ marginTop: '1rem' }}>
        {countdown > 0
          ? `⏳ Time remaining: ${countdown} second${countdown === 1 ? '' : 's'}`
          : '🕒 Waiting for next question...'}
      </p>
    </div>
  );
}

export default PlayQuiz;
