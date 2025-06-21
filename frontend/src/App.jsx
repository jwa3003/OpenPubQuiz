import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [quizzes, setQuizzes] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/quiz')
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setQuizzes(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('❌ Failed to fetch quizzes:', err);
        setQuizzes(null); // signify error state
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>🧠 OpenPubQuiz</h1>

      {loading ? (
        <p>Loading quizzes...</p>
      ) : quizzes === null ? (
        <p style={{ color: 'red' }}>❌ Could not connect to the backend.</p>
      ) : quizzes.length === 0 ? (
        <p>No quizzes found.</p>
      ) : (
        <>
          <h2>Available Quizzes</h2>
          <ul>
            {quizzes.map((quiz) => (
              <li key={quiz.id}>{quiz.name}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
