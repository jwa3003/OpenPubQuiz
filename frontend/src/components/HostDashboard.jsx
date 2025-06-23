import { useEffect, useState } from 'react';
import socket from '../socket';

function HostDashboard({ sessionId, quizId, quizName, onBack }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!sessionId) return;

    socket.emit('joinRoom', { quizId, playerName: null, role: 'host', sessionId });

    const handleUserJoined = (player) => {
      setPlayers((prev) => {
        if (!prev.find((p) => p.id === player.id)) {
          return [...prev, player];
        }
        return prev;
      });
    };

    socket.on('userJoined', handleUserJoined);

    return () => {
      socket.off('userJoined', handleUserJoined);
    };
  }, [sessionId, quizId]);

  return (
    <div style={{ padding: '1rem' }}>
    <h2>🛠 Host Dashboard</h2>
    <p><strong>Session ID:</strong> <code>{sessionId}</code></p>

    {quizId ? (
      <>
      <p><strong>Quiz ID:</strong> <code>{quizId}</code></p>
      <p><strong>Quiz Name:</strong> {quizName || 'Untitled Quiz'}</p>
      </>
    ) : (
      <>
      <p><strong>Quiz:</strong> <em>No quiz loaded yet</em></p>
      <button onClick={() => alert('Create quiz UI goes here')}>
      ➕ Create New Quiz
      </button>
      <button onClick={() => alert('Load quiz UI goes here')}>
      📂 Load Existing Quiz
      </button>
      </>
    )}

    <h3>👥 Connected Players</h3>
    {players.length === 0 ? (
      <p>No players joined yet...</p>
    ) : (
      <ul>
      {players.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
      </ul>
    )}

    <button onClick={onBack} style={{ marginTop: '1rem' }}>
    🔙 Back to Role Select
    </button>
    </div>
  );
}

export default HostDashboard;
