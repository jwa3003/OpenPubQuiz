import { useState } from 'react';
import RoleSelect from './components/RoleSelect';
import PlayQuiz from './components/PlayQuiz';
import HostDashboard from './components/HostDashboard';

function App() {
  const [role, setRole] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);

  const handleRoleSelect = (selectedRole, info) => {
    setRole(selectedRole);
    setSessionInfo(info);
  };

  const handleBackToRoleSelect = () => {
    setRole(null);
    setSessionInfo(null);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
    {!role && <RoleSelect onSelectRole={handleRoleSelect} />}

    {role === 'player' && sessionInfo && (
      <div>
      <h2>🎮 Player Mode</h2>
      <p>Welcome, <strong>{sessionInfo.playerName}</strong>!</p>
      <p>Joining session: <strong>{sessionInfo.sessionId}</strong></p>
      <PlayQuiz
      sessionId={sessionInfo.sessionId}
      quizId={sessionInfo.quizId}
      onBack={handleBackToRoleSelect}
      />
      </div>
    )}

    {role === 'host' && sessionInfo && (
      <HostDashboard
      sessionId={sessionInfo.sessionId}
      quizId={sessionInfo.quizId}
      quizName={sessionInfo.quizName}
      onBack={handleBackToRoleSelect}
      />
    )}
    </div>
  );
}

export default App;
