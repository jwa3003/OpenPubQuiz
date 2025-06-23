import { useState } from 'react';
import socket from '../socket';

function RoleSelect({ onSelectRole }) {
  const [role, setRole] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleHost = async () => {
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // No quiz_id
      });

      if (!res.ok) throw new Error('Failed to create session');
      const data = await res.json();

      onSelectRole('host', {
        sessionId: data.session_id,
        quizId: data.quiz_id,
        quizName: null,
      });

      socket.emit('joinRoom', {
        sessionId: data.session_id,
        playerName: null,
        role: 'host',
      });
    } catch (err) {
      setErrorMessage('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    setErrorMessage('');
    if (!playerName || !sessionId) {
      setErrorMessage('Please enter both name and session ID.');
      return;
    }

    setLoading(true);

    fetch(`http://localhost:3001/api/sessions/${sessionId.toUpperCase()}`)
    .then((res) => {
      if (!res.ok) throw new Error('Session not found');
      return res.json();
    })
    .then((sessionData) => {
      const { quiz_id, quiz_name } = sessionData;
      onSelectRole('player', {
        playerName,
        sessionId: sessionId.toUpperCase(),
                   quizId: quiz_id,
                   quizName: quiz_name,
      });

      socket.emit('joinRoom', {
        sessionId: sessionId.toUpperCase(),
                  playerName,
                  role: 'player',
      });
    })
    .catch(() => {
      setErrorMessage('❌ Session ID not found. Please check and try again.');
    })
    .finally(() => setLoading(false));
  };

  return (
    <div style={{ padding: '2rem' }}>
    <h1>🧠 OpenPubQuiz</h1>

    {!role && (
      <>
      <button onClick={() => setRole('player')} style={{ marginRight: '1rem' }}>
      🎮 Join as Player
      </button>
      <button onClick={handleHost} disabled={loading}>
      {loading ? 'Creating...' : '🛠 Host a Quiz'}
      </button>
      {errorMessage && <p style={{ color: 'red', marginTop: '1rem' }}>{errorMessage}</p>}
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
      disabled={loading}
      />
      </label>
      <br />
      <br />
      <label>
      Session ID:
      <input
      type="text"
      value={sessionId}
      onChange={(e) => setSessionId(e.target.value.toUpperCase())}
      style={{ marginLeft: '1rem' }}
      disabled={loading}
      />
      </label>
      <br />
      <br />
      <button onClick={handleJoin} disabled={loading}>
      {loading ? 'Joining...' : '✅ Join'}
      </button>
      {errorMessage && <p style={{ color: 'red', marginTop: '1rem' }}>{errorMessage}</p>}
      <br />
      <button onClick={() => setRole(null)} disabled={loading}>
      🔙 Back
      </button>
      </div>
    )}
    </div>
  );
}

export default RoleSelect;
