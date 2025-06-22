import { useEffect, useState } from 'react';
import RoleSelect from './components/RoleSelect';
import PlayQuiz from './components/PlayQuiz';
import HostDashboard from './components/HostDashboard';

function App() {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState(null); // 'host' or 'player'
  const [playerInfo, setPlayerInfo] = useState(null); // { playerName, quizId } or { quizId }

  useEffect(() => {
    fetch('http://localhost:3001/api/quiz')
      .then((res) => res.json())
      .then((data) => {
        setQuizzes(data);
        setLoading(false);
      });
  }, []);

  const handleRoleSelect = (selectedRole, info) => {
    setRole(selectedRole);
    setPlayerInfo(info);

    // If hosting, create the quiz in the database
    if (selectedRole === 'host' && info.quizId) {
      fetch('http://localhost:3001/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: info.quizId, name: 'Untitled Quiz' }) // you can replace with dynamic name
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log('✅ Quiz created!');
          } else {
            console.error('❌ Failed to create quiz:', data.error);
          }
        })
        .catch((err) => {
          console.error('❌ Error creating quiz:', err);
        });
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      {!role && <RoleSelect onSelectRole={handleRoleSelect} />}

      {role === 'player' && playerInfo && (
        <div>
          <h2>🎮 Player Mode</h2>
          <p>Welcome, <strong>{playerInfo.playerName}</strong>!</p>
          <p>Joining quiz with ID: <strong>{playerInfo.quizId}</strong></p>
          <PlayQuiz quizId={playerInfo.quizId} />
        </div>
      )}

      {role === 'host' && playerInfo && (
        <HostDashboard quizId={playerInfo.quizId} />
      )}
    </div>
  );
}

export default App;

