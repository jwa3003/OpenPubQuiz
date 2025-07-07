// components/common/Timer.jsx
import React from 'react';

// Only render the button if onStart is provided (host only)
function Timer({ countdown, onStart, disabled }) {
  if (!onStart) {
    return (
      <span>
        {countdown > 0 ? `Next question in ${countdown}s` : '🕒 Waiting for next question...'}
      </span>
    );
  }
  return (
    <button onClick={onStart} disabled={disabled || countdown > 0}>
      {countdown > 0 ? `Next question in ${countdown}s` : 'Start Timer (Force Next)'}
    </button>
  );
}

export default Timer;
