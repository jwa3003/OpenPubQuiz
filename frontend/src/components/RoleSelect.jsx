import { useState } from 'react';
import socket from '../socket';

function RoleSelect({ onSelectRole }) {
  const [role, setRole] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [quizId, setQuizId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleJoin = () => {
    if (!playerName || !quizId) {
      setErrorMessage('Please enter both name and quiz ID.');
      return;
    }

    // Check if the quiz exists before joining
    fetch(`http://localhost:3001/api/quiz/${quizId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Quiz not found');
        }
        return res.json();
      })
      .then(() => {
        // Proceed to join as player
        onSelectRole('player', { playerName, quizId });

        socket.emit('joinRoom', {
          quizId,
          playerName,
          role: 'player',
        });
      })
      .catch((err) => {
        setErrorMessage('❌ Quiz ID not found. Please check and try again.');
      });
  };

  const handleHost = () => {
    const generatedQuizId = Math.random().toString(36).substring(2, 8).toUpperCase();
    onSelectRole('host', { quizId: generatedQuizId });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🧠 OpenPubQuiz</h1>

      {!role && (
        <>
          <button onClick={() => setRole('player')} style={{ marginRight: '1rem' }}>
            🎮 Join as Player
          </button>
          <button onClick={handleHost}>🛠 Host a Quiz</button>
        </>
      )}

      {role === 'player' && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2>Join Quiz</h2>
          <label>
            Player Name:
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{ marginLeft: '1rem' }}
            />
          </label>
          <br /><br />
          <label>
            Quiz ID:
            <input
              type="text"
              value={quizId}
              onChange={(e) => setQuizId(e.target.value.toUpperCase())}
              style={{ marginLeft: '1rem' }}
            />
          </label>
          <br /><br />
          <button onClick={handleJoin}>✅ Join</button>
          {errorMessage && (
            <p style={{ color: 'red', marginTop: '1rem' }}>{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default RoleSelect;
