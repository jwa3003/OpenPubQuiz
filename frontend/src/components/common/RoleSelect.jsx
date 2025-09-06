import { useState } from 'react';
import socket from '../../socket';

const API_BASE = '/api';

function RoleSelect({ onSelectRole }) {
  const [role, setRole] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleHost = async () => {
    setErrorMessage('');
    setLoading(true);

    try {
  const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
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
        teamName: null,
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
    if (!teamName || !sessionId) {
      setErrorMessage('Please enter both team name and session ID.');
      return;
    }

    setLoading(true);

  fetch(`${API_BASE}/sessions/${sessionId.toUpperCase()}`)
    .then((res) => {
      if (!res.ok) throw new Error('Session not found');
      return res.json();
    })
    .then((sessionData) => {
      const { quiz_id, quiz_name } = sessionData;
      onSelectRole('player', {
        teamName,
        sessionId: sessionId.toUpperCase(),
        quizId: quiz_id,
        quizName: quiz_name,
      });

      socket.emit('joinRoom', {
        sessionId: sessionId.toUpperCase(),
        teamName,
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
      🎮 Join as Team
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
      Team Name:
      <input
      type="text"
      value={teamName}
      onChange={(e) => setTeamName(e.target.value)}
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
