import { useEffect, useState } from 'react';
import socket from '../socket';

function PlayQuiz({ sessionId, quizId, onBack }) {
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answersMap, setAnswersMap] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    socket.emit('joinRoom', { quizId, playerName: null, role: 'player', sessionId });

    socket.on('timerStarted', () => {
      alert('⏱ Timer started!');
    });

    socket.on('nextQuestion', () => {
      setCurrentIndex((prev) => prev + 1);
    });

    socket.on('quiz-started', () => {
      setQuizStarted(true);
    });

    socket.on('first-question', ({ question, answers }) => {
      alert('📨 First question received: ' + question.text);
      setQuestions([question]);
      setAnswersMap((prev) => ({ ...prev, [question.id]: answers }));
    });

    socket.on('quiz-loaded', ({ quizId: newQuizId, quizName }) => {
      console.log(`🧠 Quiz loaded dynamically: ${quizName}`);
      setQuiz({ id: newQuizId, name: quizName });
      setLoading(false);
    });

    // If we already have a quizId (e.g. from RoleSelect), load the quiz info
    if (quizId) {
      fetch(`http://localhost:3001/api/quiz/${quizId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Quiz not found');
        return res.json();
      })
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
      socket.off('timerStarted');
      socket.off('nextQuestion');
      socket.off('quiz-started');
      socket.off('first-question');
      socket.off('quiz-loaded');
    };
  }, [sessionId, quizId]);

  const handleAnswer = (questionId, answerId) => {
    socket.emit('submitAnswer', {
      sessionId,
      quizId: quiz?.id,
      questionId,
      answerId,
      playerId: socket.id,
    });

    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerId }));
    setCurrentIndex((prev) => prev + 1);
  };

  const handleShowResults = () => {
    setShowResults(true);
  };

  if (loading) return <p>Loading quiz info...</p>;
  if (!quiz) return <p>Waiting for quiz to be selected...</p>;

  if (!quizStarted) {
    return (
      <div>
      <h2>{quiz.name}</h2>
      <p>⏳ Waiting for the host to start the quiz...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswers = currentQuestion ? (answersMap[currentQuestion.id] || []) : [];

  if (showResults) {
    let correctCount = 0;
    return (
      <div>
      <h2>📊 Results for {quiz.name}</h2>
      {questions.map((q) => {
        const correctAnswer = answersMap[q.id]?.find((a) => a.is_correct);
        const selected = selectedAnswers[q.id];
        const isCorrect = selected === correctAnswer?.id;
        if (isCorrect) correctCount++;
        return (
          <div key={q.id} style={{ marginBottom: '1rem' }}>
          <strong>{q.text}</strong>
          <p>✅ Correct answer: <b>{correctAnswer?.text}</b></p>
          <p style={{
            color: isCorrect ? 'green' : 'red',
            fontWeight: 'bold',
          }}>
          You answered: {answersMap[q.id]?.find((a) => a.id === selected)?.text || '—'} ({isCorrect ? 'Correct' : 'Incorrect'})
          </p>
          </div>
        );
      })}
      <h3>Your Score: {correctCount} / {questions.length}</h3>
      <button onClick={onBack}>🔙 Back</button>
      </div>
    );
  }

  if (currentIndex >= questions.length) {
    return (
      <div>
      <h2>Done!</h2>
      <button onClick={handleShowResults}>Show Results</button>
      </div>
    );
  }

  return (
    <div>
    <h2>{quiz.name}</h2>
    {currentQuestion ? (
      <div>
      <h3>Question {currentIndex + 1} of {questions.length}</h3>
      <p><strong>{currentQuestion.text}</strong></p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
      {currentAnswers.map((ans) => (
        <li key={ans.id} style={{ marginBottom: '0.5rem' }}>
        <button
        onClick={() => handleAnswer(currentQuestion.id, ans.id)}
        style={{ padding: '0.5rem 1rem' }}
        >
        {ans.text}
        </button>
        </li>
      ))}
      </ul>
      </div>
    ) : (
      <p>Loading question...</p>
    )}
    </div>
  );
}

export default PlayQuiz;
