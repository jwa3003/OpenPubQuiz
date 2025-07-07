import React from 'react';

function HostStepReview({ reviewQuestion, reviewIndex, reviewTotal, onNext, onEnd }) {
  if (!reviewQuestion) return <div>No review data.</div>;
  return (
    <div style={{ padding: 24, background: '#232a36', color: '#fff', borderRadius: 12, maxWidth: 900, margin: '2rem auto' }}>
      <h2>Review Phase ({reviewIndex + 1} / {reviewTotal})</h2>
      <h3>{reviewQuestion.questionText}</h3>
      <div><strong>Correct Answer:</strong> {reviewQuestion.correctAnswerText}</div>
      {reviewQuestion.explanation && <div><em>{reviewQuestion.explanation}</em></div>}
      <table className="review-answers-table" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Team</th>
            <th>Answer</th>
            <th>Correct?</th>
          </tr>
        </thead>
        <tbody>
          {reviewQuestion.teamAnswers.map(ans => (
            <tr key={ans.teamId}>
              <td>{ans.teamName}</td>
              <td>{ans.answerText}</td>
              <td>{ans.isCorrect ? '✔️' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 24 }}>
        {reviewIndex < reviewTotal - 1 ? (
          <button onClick={onNext} style={{ fontSize: '1.1rem', padding: '8px 24px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Next</button>
        ) : (
          <button onClick={onEnd} style={{ fontSize: '1.1rem', padding: '8px 24px', background: '#43a047', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>End Review / Show Leaderboard</button>
        )}
      </div>
    </div>
  );
}

export default HostStepReview;
