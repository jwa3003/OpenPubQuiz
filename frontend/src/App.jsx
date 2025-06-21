import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [mode, setMode] = useState(null); // 'host' or 'play'
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);

  // Load quizzes
  const fetchQuizzes = () => {
    setLoading(true);
    fetch('http://localhost:3001/api/quiz')
      .then((res) => res.json())
      .then((data) => {
        setQuizzes(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching quizzes:', err);
        setError('Could not load quizzes.');
        setLoading(false);
      });
  };

  // Load questions for selected quiz
  const fetchQuestions = (quizId) => {
    fetch(`http://localhost:3001/api/question/quiz/${quizId}`)
      .then((res) => res.json())
      .then((data) => setQuestions(data))
      .catch((err) => {
        console.error('Error fetching questions:', err);
        setError('Could not load questions.');
      });
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleQuizSelect = (quiz) => {
    setSelectedQuiz(quiz);
    fetchQuestions(quiz.id);
  };

  const renderLanding = () => (
    <div>
      <h1>🧠 OpenPubQuiz</h1>
      <button onClick={() => setMode('host')}>➕ Host a Quiz</button>
      <button onClick={() => setMode('play')} style={{ marginLeft: '1rem' }}>
        ▶️ Play a Quiz
      </button>
    </div>
  );

  const renderPlayMode = () => (
    <div>
      <h2>🎮 Select a Quiz to Play</h2>
      {loading ? (
        <p>Loading quizzes...</p>
      ) : (
        <ul>
          {quizzes.map((quiz) => (
            <li key={quiz.id}>
              <button onClick={() => handleQuizSelect(quiz)}>{quiz.name}</button>
            </li>
          ))}
        </ul>
      )}

      {selectedQuiz && (
        <>
          <h3>📝 Questions in {selectedQuiz.name}</h3>
          {questions.length === 0 ? (
            <p>No questions found for this quiz.</p>
          ) : (
            <ol>
              {questions.map((q) => (
                <li key={q.id}>{q.text}</li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );

  const renderHostMode = () => (
    <div>
      <h2>🛠 Host Mode (Coming Soon)</h2>
      <p>You’ll be able to create full quizzes here!</p>
    </div>
  );

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!mode && renderLanding()}
      {mode === 'host' && renderHostMode()}
      {mode === 'play' && renderPlayMode()}
    </div>
  );
}

export default App;
