import { useState } from 'react';
import socket from '../socket';

function RoleSelect({ onSelectRole }) {
  const [role, setRole] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleJoin = () => {
    if (!playerName || !sessionId) {
      setErrorMessage('Please enter both name and session ID.');
      return;
    }

    fetch(`http://localhost:3001/api/sessions/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Session not found');
        return res.json();
      })
      .then((sessionData) => {
        const quizId = sessionData.quiz_id;
        onSelectRole('player', { playerName, sessionId, quizId });

        socket.emit('joinRoom', {
          sessionId,
          playerName,
          role: 'player',
        });
      })
      .catch(() => {
        setErrorMessage('❌ Session ID not found. Please check and try again.');
      });
  };

  const handleHost = () => {
    const generatedQuizId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const generatedSessionId = Math.random().toString(36).substring(2, 12).toUpperCase();

    fetch('http://localhost:3001/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: generatedQuizId, name: 'Untitled Quiz' }),
    })
      .then((res) => res.json())
      .then(() =>
        fetch('http://localhost:3001/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: generatedSessionId,
            quiz_id: generatedQuizId,
          }),
        })
      )
      .then((res) => res.json())
      .then(() => {
        onSelectRole('host', {
          sessionId: generatedSessionId,
          quizId: generatedQuizId,
        });

        socket.emit('joinRoom', {
          sessionId: generatedSessionId,
          playerName: null,
          role: 'host',
        });
      })
      .catch(() => {
        setErrorMessage('❌ Failed to create quiz or session. Please try again.');
      });
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
            Your Name:
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{ marginLeft: '1rem' }}
            />
          </label>
          <br /><br />
          <label>
            Session ID:
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value.toUpperCase())}
              style={{ marginLeft: '1rem' }}
            />
          </label>
          <br /><br />
          <button onClick={handleJoin}>✅ Join</button>
          {errorMessage && <p style={{ color: 'red', marginTop: '1rem' }}>{errorMessage}</p>}
        </div>
      )}
    </div>
  );
}

export default RoleSelect;
