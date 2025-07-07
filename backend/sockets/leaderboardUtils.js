// backend/sockets/leaderboardUtils.js
// Handles leaderboard calculation and emission

const { getIO } = require('../utils/socketInstance.js');

function emitLeaderboard(sessionId, scores, teamNames) {
  const io = getIO();
  if (!scores) return;

  const leaderboard = Array.from(scores.entries())
    .map(([teamId, score]) => ({
      teamName: teamNames.get(teamId) || 'Unknown',
      score,
    }))
    .sort((a, b) => b.score - a.score);

  const roomId = `session-${sessionId}`;
  io.to(roomId).emit('final-leaderboard', leaderboard);
  console.log('🏁 Final leaderboard:', leaderboard);
}

module.exports = {
  emitLeaderboard,
};
