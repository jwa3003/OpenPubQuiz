// components/common/Timer.jsx
import React from 'react';

function Timer({ countdown, onStart, disabled }) {
  return (
    <button onClick={onStart} disabled={disabled || countdown > 0}>
      {countdown > 0 ? `Next question in ${countdown}s` : 'Start Timer (Force Next)'}
    </button>
  );
}

export default Timer;
