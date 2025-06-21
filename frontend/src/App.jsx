import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [quizzes, setQuizzes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newQuizName, setNewQuizName] = useState('');
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchQuizzes = () => {
    setLoading(true);
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
        setQuizzes(null);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!newQuizName.trim()) {
      setError('Quiz name cannot be empty');
      return;
    }

    setSubmitLoading(true);
    fetch('http://localhost:3001/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newQuizName.trim() }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setNewQuizName('');
        fetchQuizzes(); // refresh quiz list
      })
      .catch((err) => {
        console.error('❌ Failed to add quiz:', err);
        setError('Failed to add quiz. Please try again.');
      })
      .finally(() => {
        setSubmitLoading(false);
      });
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>🧠 OpenPubQuiz</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="New quiz name"
          value={newQuizName}
          onChange={(e) => setNewQuizName(e.target.value)}
          disabled={submitLoading}
          style={{ padding: '0.5rem', fontSize: '1rem', width: '300px' }}
        />
        <button
          type="submit"
          disabled={submitLoading}
          style={{ marginLeft: '0.5rem', padding: '0.5rem 1rem', fontSize: '1rem' }}
        >
          {submitLoading ? 'Adding...' : 'Add Quiz'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

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
