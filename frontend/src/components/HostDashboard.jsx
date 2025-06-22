import { useEffect, useState } from 'react';
import socket from '../socket';

function HostDashboard({ quizId }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    socket.emit('joinRoom', { quizId, role: 'host' });

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
  }, [quizId]);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>🛠 Host Dashboard</h2>
      <p><strong>Quiz ID:</strong> <code>{quizId}</code></p>
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
    </div>
  );
}

export default HostDashboard;
