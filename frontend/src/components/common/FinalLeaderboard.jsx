import React from 'react';
import './FinalLeaderboard.css';

/**
 * FinalLeaderboard
 * Displays the final leaderboard in a styled, review-like format.
 * Highlights the current team if currentTeamId is provided.
 * Props:
 *   - leaderboard: Array of { teamId, teamName, score }
 *   - currentTeamId: (optional) highlight this team
 */
const FinalLeaderboard = ({ leaderboard, currentTeamId, title = '🏆 Final Leaderboard' }) => {
  if (!leaderboard || leaderboard.length === 0) return null;
  return (
    <div className="final-leaderboard">
      <h2>{title}</h2>
      <ol className="final-leaderboard-list">
        {leaderboard.map((entry, idx) => (
          <li
            key={entry.teamId || entry.teamName}
            className={currentTeamId && entry.teamId === currentTeamId ? 'highlight' : ''}
          >
            <span className="final-leaderboard-rank">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}</span>
            <span className="final-leaderboard-team">{entry.teamName}</span>
            <span className="final-leaderboard-score">{entry.score} pt{entry.score !== 1 ? 's' : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default FinalLeaderboard;
