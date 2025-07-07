// backend/sockets/timerUtils.js
// Handles countdown and timer logic for quiz sessions

const { getIO } = require('../utils/socketInstance.js');

const timers = new Map(); // Store timers per session

function startCountdown(sessionId, seconds = 5, onEnd) {
  const io = getIO();
  const roomId = `session-${sessionId}`;
  let timeLeft = seconds;

  if (timers.has(sessionId)) {
    clearInterval(timers.get(sessionId));
  }

  io.to(roomId).emit('countdown', timeLeft);

  const timer = setInterval(() => {
    timeLeft -= 1;
    if (timeLeft > 0) {
      io.to(roomId).emit('countdown', timeLeft);
    } else {
      clearInterval(timer);
      timers.delete(sessionId);
      // Instead of calling onEnd immediately, emit timer-ended and call onEnd after a short delay
      io.to(roomId).emit('countdown', 0);
      io.to(roomId).emit('timer-ended');
      setTimeout(() => {
        if (onEnd) onEnd();
      }, 700); // 700ms grace period for clients to submit
    }
  }, 1000);

  timers.set(sessionId, timer);
}

module.exports = {
  startCountdown,
  timers,
};
