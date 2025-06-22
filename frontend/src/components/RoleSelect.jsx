import { useState } from 'react';

function RoleSelect({ onSelectRole }) {
  const [role, setRole] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [quizId, setQuizId] = useState('');

  const handleJoin = () => {
    if (!playerName || !quizId) return;
    onSelectRole('player', { playerName, quizId });
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
          <button onClick={() => setRole('host')}>🛠 Host a Quiz</button>
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
        </div>
      )}
    </div>
  );
}

export default RoleSelect;
