import { useEffect, useState } from 'react';
import RoleSelect from './components/RoleSelect';
import PlayQuiz from './components/PlayQuiz';

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
  };

  const renderPlayMode = () => {
    if (selectedQuiz) {
      return (
        <PlayQuiz quiz={selectedQuiz} onBack={() => setSelectedQuiz(null)} />
      );
    }

    return (
      <div>
        <h2>🎮 Select a Quiz to Play</h2>
        {loading ? (
          <p>Loading quizzes...</p>
        ) : (
          <ul>
            {quizzes.map((quiz) => (
              <li key={quiz.id}>
                <button onClick={() => setSelectedQuiz(quiz)}>{quiz.name}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      {/* Step 1: Choose Host or Player */}
      {!role && <RoleSelect onSelectRole={handleRoleSelect} />}

      {/* Step 2a: Player view (existing PlayQuiz flow) */}
      {role === 'player' && playerInfo && (
        <div>
          <h2>🎮 Player Mode</h2>
          <p>Welcome, <strong>{playerInfo.playerName}</strong>!</p>
          <p>Joining quiz with ID: <strong>{playerInfo.quizId}</strong></p>
          {renderPlayMode()}
        </div>
      )}

      {/* Step 2b: Host view (TODO: build HostDashboard) */}
      {role === 'host' && playerInfo && (
        <div>
          <h2>🛠 Host Mode</h2>
          <p>You are hosting a quiz with ID: <strong>{playerInfo.quizId}</strong></p>
          {/* TODO: Host dashboard goes here */}
        </div>
      )}
    </div>
  );
}

export default App;
