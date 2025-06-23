import { useEffect, useState } from 'react';
import socket from '../socket';
import QuizBuilder from './QuizBuilder';

function HostDashboard({ sessionId, quizId, quizName, onBack }) {
  const [players, setPlayers] = useState([]);
  const [localQuizId, setLocalQuizId] = useState(quizId);
  const [localQuizName, setLocalQuizName] = useState(quizName);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    socket.emit('joinRoom', {
      sessionId,
      playerName: null,
      role: 'host',
      quizId: localQuizId || null,
    });

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
  }, [sessionId, localQuizId]);

  // When QuizBuilder finishes creating quiz
  const onQuizCreated = async (id, name) => {
    try {
      const updateRes = await fetch(`http://localhost:3001/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: id }),
      });
      if (!updateRes.ok) throw new Error('Failed to update session with quiz');

      setLocalQuizId(id);
      setLocalQuizName(name);
      setIsCreatingQuiz(false);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
    <h2>🛠 Host Dashboard</h2>
    <p>
    <strong>Session ID:</strong> <code>{sessionId}</code>
    </p>

    {localQuizName ? (
      <p>
      <strong>Quiz Name:</strong> {localQuizName}
      </p>
    ) : isCreatingQuiz ? (
      <QuizBuilder onQuizCreated={onQuizCreated} onCancel={() => setIsCreatingQuiz(false)} />
    ) : (
      <>
      <p>
      <strong>Quiz:</strong> <em>No quiz loaded yet</em>
      </p>
      <button onClick={() => setIsCreatingQuiz(true)}>➕ Create New Quiz</button>
      <button onClick={() => alert('Load quiz UI goes here')}>📂 Load Existing Quiz</button>
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
