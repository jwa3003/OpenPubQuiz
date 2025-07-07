// components/common/QuestionDisplay.jsx
import React from 'react';

function QuestionDisplay({ question }) {
  if (!question) return null;
  return (
    <div>
      <h3>Current Question</h3>
      <p><strong>{question.text}</strong></p>
    </div>
  );
}

export default QuestionDisplay;
