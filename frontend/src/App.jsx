import { useState, useEffect } from 'react';
import RoleSelect from './components/common/RoleSelect';
import PlayQuiz from './components/player/PlayQuiz';
import HostDashboard from './components/host/HostDashboard';


function App() {
  // Try to load from localStorage on first render
  const [role, setRole] = useState(() => {
    try {
      return localStorage.getItem('role') || null;
    } catch {
      return null;
    }
  });
  const [sessionInfo, setSessionInfo] = useState(() => {
    try {
      const data = localStorage.getItem('sessionInfo');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  });

  // Save to localStorage whenever role or sessionInfo changes
  useEffect(() => {
    try {
      if (role) {
        localStorage.setItem('role', role);
      } else {
        localStorage.removeItem('role');
      }
      if (sessionInfo) {
        localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
      } else {
        localStorage.removeItem('sessionInfo');
      }
    } catch {}
  }, [role, sessionInfo]);

  const handleRoleSelect = (selectedRole, info) => {
    setRole(selectedRole);
    setSessionInfo(info);
  };

  const handleBackToRoleSelect = () => {
    setRole(null);
    setSessionInfo(null);
    try {
      localStorage.removeItem('role');
      localStorage.removeItem('sessionInfo');
    } catch {}
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <button
        style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}
        onClick={() => {
          localStorage.clear();
          window.location.reload();
        }}
        title="Clear all local data and reload"
      >
        🧹 Clear Local Data
      </button>

      {!role && <RoleSelect onSelectRole={handleRoleSelect} />}

      {role === 'player' && sessionInfo && (
        <div>
          <h2>🎮 Player Mode</h2>
          <p>Welcome Team, <strong>{sessionInfo.teamName}</strong>!</p>
          <p>Joining session: <strong>{sessionInfo.sessionId}</strong></p>
          <PlayQuiz
            sessionId={sessionInfo.sessionId}
            quizId={sessionInfo.quizId}
            teamName={sessionInfo.teamName}
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
