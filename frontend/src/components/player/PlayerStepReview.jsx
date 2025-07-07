import React from 'react';

function PlayerStepReview({ reviewQuestion, reviewIndex, reviewTotal, currentTeamId }) {
  if (!reviewQuestion) return <div>No review data.</div>;
  const myAnswer = reviewQuestion.teamAnswers.find(ans => ans.teamId === currentTeamId);
  return (
    <div style={{ padding: 24, background: '#232a36', color: '#fff', borderRadius: 12, maxWidth: 700, margin: '2rem auto' }}>
      <h2>Review Phase ({reviewIndex + 1} / {reviewTotal})</h2>
      <h3>{reviewQuestion.questionText}</h3>
      <div><strong>Correct Answer:</strong> {reviewQuestion.correctAnswerText}</div>
      {reviewQuestion.explanation && <div><em>{reviewQuestion.explanation}</em></div>}
      <h4>Your Answer:</h4>
      <div style={{ color: myAnswer?.isCorrect ? '#4caf50' : '#f44336', fontWeight: 600, fontSize: '1.1rem' }}>
        {myAnswer ? myAnswer.answerText : <em>No answer submitted</em>}
      </div>
      <p style={{ marginTop: 24, color: '#bbb' }}><em>Waiting for the host to continue...</em></p>
    </div>
  );
}

export default PlayerStepReview;
