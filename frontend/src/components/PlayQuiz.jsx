import socket from '../socket';
import { useEffect, useState } from 'react';

function PlayQuiz({ quiz, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [answersMap, setAnswersMap] = useState({}); // questionId -> [answers]
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    socket.emit('joinRoom', `quiz-${quiz.id}`);

    socket.on('timerStarted', () => {
      alert('⏱ Timer started!');
      // Later: start actual timer here
    });

    socket.on('nextQuestion', () => {
      setCurrentIndex((prev) => prev + 1);
    });

    fetch(`http://localhost:3001/api/question/quiz/${quiz.id}`)
      .then((res) => res.json())
      .then((qList) => {
        setQuestions(qList);
        qList.forEach((q) => {
          fetch(`http://localhost:3001/api/answer/question/${q.id}`)
            .then((res) => res.json())
            .then((aList) => {
              setAnswersMap((prev) => ({ ...prev, [q.id]: aList }));
            });
        });
      });
  }, [quiz.id]);

  const handleAnswer = (questionId, answerId) => {
    socket.emit('submitAnswer', {
      room: `quiz-${quiz.id}`,
      questionId: currentQuestion.id,
      answerId,
      playerId: socket.id,
    });

    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerId }));
    setCurrentIndex((prev) => prev + 1);
  };

  const handleShowResults = () => {
    setShowResults(true);
  };

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
              <p>
                ✅ Correct answer: <b>{correctAnswer?.text}</b>
              </p>
              <p
                style={{
                  color: isCorrect ? 'green' : 'red',
                  fontWeight: 'bold',
                }}
              >
                You answered: {answersMap[q.id]?.find((a) => a.id === selected)?.text || '—'} (
                {isCorrect ? 'Correct' : 'Incorrect'})
              </p>
            </div>
          );
        })}
        <h3>Your Score: {correctCount} / {questions.length}</h3>
        <button onClick={onBack}>🔙 Back to Quiz List</button>
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
