// components/common/Leaderboard.jsx
import React from 'react';

function Leaderboard({ leaderboard, formatRank }) {
  if (!leaderboard || leaderboard.length === 0) return null;
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h4>📊 Live Leaderboard</h4>
      <ol style={{ listStyleType: 'none', paddingLeft: 0 }}>
        {leaderboard.map((entry, index) => (
          <li key={`${entry.teamName}-${index}`}>
            {formatRank(index + 1)} {entry.teamName} with {entry.score} point{entry.score !== 1 ? 's' : ''}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default Leaderboard;
