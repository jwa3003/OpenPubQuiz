// backend/sockets/leaderboardUtils.js
// Handles leaderboard calculation and emission

const { getIO } = require('../utils/socketInstance.js');


function emitLeaderboard(sessionId, scores, teamNames, isFinal = false) {
  const io = getIO();
  if (!scores) return;

  const leaderboard = Array.from(scores.entries())
    .map(([teamId, score]) => ({
      teamId, // include teamId for client-side highlighting
      teamName: teamNames.get(teamId) || 'Unknown',
      score,
    }))
    .sort((a, b) => b.score - a.score);

  const roomId = `session-${sessionId}`;
  if (isFinal) {
    io.to(roomId).emit('final-leaderboard', leaderboard);
    console.log('🏁 Final leaderboard:', leaderboard);
  } else {
    io.to(roomId).emit('current-leaderboard', leaderboard);
    console.log('📊 Current leaderboard:', leaderboard);
  }
}

module.exports = {
  emitLeaderboard,
};
