
import React, { useEffect, useState, useRef } from 'react';
import socket from '../../socket';
import QuizBuilder from '../quiz/QuizBuilder';
import HostQuiz from './HostQuiz';

const API_BASE = '/api';

function HostDashboard({ sessionId, quizId, quizName, onBack }) {
  const [allTeamsSelectedDouble, setAllTeamsSelectedDouble] = useState(false);
  const pollIntervalRef = useRef(null);
  const [teams, setTeams] = useState([]);
  const [localQuizId, setLocalQuizId] = useState(quizId);
  const [localQuizName, setLocalQuizName] = useState(quizName);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [showQuizSelector, setShowQuizSelector] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  // For edit mode
  const [editingQuizData, setEditingQuizData] = useState(null);

  // Listen for double-category updates and update status immediately
  useEffect(() => {
    if (!sessionId || quizStarted) return;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/double-category/status?session_id=${sessionId}`);
        if (!res.ok) throw new Error('Failed to fetch double-category status');
        const data = await res.json();
        setAllTeamsSelectedDouble(
          data.allTeamIds && data.allTeamIds.length > 0 &&
          data.notSelectedTeamIds && data.notSelectedTeamIds.length === 0
        );
      } catch (err) {
        setAllTeamsSelectedDouble(false);
      }
    };
    fetchStatus();
    socket.on('double-category-updated', fetchStatus);
    return () => {
      socket.off('double-category-updated', fetchStatus);
    };
  }, [sessionId, quizStarted]);

  useEffect(() => {
    if (!sessionId) return;

    socket.emit('joinRoom', {
      sessionId,
      playerName: null,
      role: 'host',
      quizId: localQuizId || null,
    });

    // Fetch current teams from backend on mount
    const fetchTeams = async () => {
      try {
        const res = await fetch(`${API_BASE}/sessions/${sessionId}/teams`);
        if (res.ok) {
          const data = await res.json();
          setTeams(data.teams || []);
        }
      } catch {}
    };
    fetchTeams();

    const handleTeamJoined = (team) => {
      console.log('[HostDashboard] teamJoined event:', team);
      if (team.role === 'host') return;
      setTeams((prev) => {
        if (!prev.find((t) => t.id === team.id)) {
          return [...prev, team];
        }
        return prev;
      });
    };

    const handleQuizStarted = () => {
      setQuizStarted(true);
    };

    // Listen for quiz-loaded event to update quiz state immediately
    const handleQuizLoaded = ({ quizId, quizName }) => {
      setLocalQuizId(quizId);
      setLocalQuizName(quizName);
    };

    socket.on('teamJoined', handleTeamJoined);
    socket.on('quiz-started', handleQuizStarted);
    socket.on('quiz-loaded', handleQuizLoaded);

    return () => {
      socket.off('teamJoined', handleTeamJoined);
      socket.off('quiz-started', handleQuizStarted);
      socket.off('quiz-loaded', handleQuizLoaded);
    };
  }, [sessionId, localQuizId]);

  useEffect(() => {
    if (showQuizSelector) {
  fetch(`${API_BASE}/quiz`)
      .then((res) => res.json())
      .then((data) => setQuizzes(data))
      .catch((err) => alert('Failed to load quizzes: ' + err.message));
    }
  }, [showQuizSelector]);

  const onQuizCreated = async (id, name) => {
    setLocalQuizId(id);
    setLocalQuizName(name);
    setIsCreatingQuiz(false);
    // Optionally, notify the user that the quiz is ready to be loaded into a session
    alert('Quiz created! To use it, select it from "Load Existing Quiz".');
  };

  const handleConfirmLoadQuiz = async () => {
    if (!selectedQuizId) {
      alert('Please select a quiz to load.');
      return;
    }

    try {
      const quiz = quizzes.find((q) => q.id === selectedQuizId);
      if (!quiz) throw new Error('Selected quiz not found');

  const updateRes = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: selectedQuizId }),
      });
      if (!updateRes.ok) {
        if (updateRes.status === 404) {
          alert('Session not found. Please start a new session as host.');
        } else {
          alert('Failed to update session with quiz.');
        }
        return;
      }

      setLocalQuizId(selectedQuizId);
      setLocalQuizName(quiz.name);
      setShowQuizSelector(false);
      setSelectedQuizId('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!localQuizId) return;

    const confirmed = window.confirm('Are you sure you want to permanently delete this quiz?');
    if (!confirmed) return;

    try {
  const res = await fetch(`${API_BASE}/quiz/${localQuizId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete quiz from database');

      setLocalQuizId(null);
      setLocalQuizName(null);
      setQuizStarted(false);
      alert('Quiz deleted from database.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStartQuiz = () => {
    if (!sessionId || !localQuizId) {
      alert('Missing session or quiz!');
      return;
    }
    socket.emit('start-quiz', { sessionId });
  };

  return (
    <div style={{ padding: '1rem' }}>
    <h2>🛠 Host Dashboard</h2>
    <p>
    <strong>Session ID:</strong> <code>{sessionId}</code>
    </p>

    {quizStarted ? (
      <HostQuiz
      sessionId={sessionId}
      quizId={localQuizId}
      players={teams}
      onQuizEnd={() => setQuizStarted(false)}
      />
    ) : (
      <>
      {localQuizName && !isCreatingQuiz ? (
        <>
        <p>
        <strong>Quiz Name:</strong> {localQuizName}
        </p>
        <button
          onClick={handleStartQuiz}
          disabled={quizStarted || !allTeamsSelectedDouble}
          style={{ marginRight: '1rem' }}
          title={allTeamsSelectedDouble ? '' : 'All teams must select a double-points category'}
        >
          ▶️ Start Quiz
        </button>
        <button
          onClick={async () => {
            // Fetch full quiz data and open QuizBuilder in edit mode
            try {
              const res = await fetch(`${API_BASE}/quiz/${localQuizId}/full`);
              if (!res.ok) throw new Error('Failed to fetch quiz data');
              const data = await res.json();
              setEditingQuizData(data);
              setIsCreatingQuiz(true);
            } catch (err) {
              alert('Failed to load quiz for editing: ' + err.message);
            }
          }}
          disabled={quizStarted}
          style={{ marginRight: '1rem' }}
        >
          ✏️ Edit Quiz
        </button>
        <button onClick={handleDeleteQuiz} disabled={quizStarted}>
        🗑️ Delete Quiz
        </button>
        {!allTeamsSelectedDouble && (
          <div style={{ color: 'red', marginTop: 4 }}>
            All teams must select a double-points category before starting.
          </div>
        )}
        </>
      ) : isCreatingQuiz ? (
        <QuizBuilder
          onQuizCreated={onQuizCreated}
          onCancel={() => { setIsCreatingQuiz(false); setEditingQuizData(null); }}
          initialQuizData={editingQuizData}
          editMode={!!editingQuizData}
        />
      ) : showQuizSelector ? (
        <>
        <p><strong>Select a Quiz:</strong></p>
        <select
        value={selectedQuizId}
        onChange={(e) => setSelectedQuizId(e.target.value)}
        style={{ minWidth: '200px' }}
        >
        <option value="">-- Choose a quiz --</option>
        {quizzes.map((q) => (
          <option key={q.id} value={q.id}>{q.name}</option>
        ))}
        </select>
        <div style={{ marginTop: '1rem' }}>
        <button onClick={handleConfirmLoadQuiz} disabled={!selectedQuizId}>
        ✅ Load Selected Quiz
        </button>
        <button onClick={() => setShowQuizSelector(false)} style={{ marginLeft: '1rem' }}>
        ❌ Cancel
        </button>
        </div>
        </>
      ) : (
        <>
        <p>
        <strong>Quiz:</strong> <em>No quiz loaded yet</em>
        </p>
        <button onClick={() => setIsCreatingQuiz(true)}>➕ Create New Quiz</button>
        <button onClick={() => setShowQuizSelector(true)}>📂 Load Existing Quiz</button>
        </>
      )}

      <h3>👥 Connected Teams</h3>
      {teams.length === 0 ? (
        <p>No teams joined yet...</p>
      ) : (
        <ul>
        {teams.map((t) => (
          <li key={t.id}>{t.name}</li>
        ))}
        </ul>
      )}

      <button onClick={onBack} style={{ marginTop: '1rem' }}>
      🔙 Back to Role Select
      </button>
      </>
    )}
    </div>
  );
}

export default HostDashboard;
