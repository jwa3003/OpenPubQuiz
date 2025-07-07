import React from 'react';

/**
 * ReviewSummary
 * Displays a summary of all quiz questions, correct answers, and all team answers.
 * Props:
 *   - reviewSummary: Array of {
 *       questionId, questionText, correctAnswerId, correctAnswerText, explanation, teamAnswers: [{ teamId, teamName, answerId, answerText }]
 *     }
 *   - currentTeamId: (optional) Only highlight this team's answers if provided
 *   - isHost: (optional) If true, show all teams; if false, only show current team
 */
const ReviewSummary = ({ reviewSummary, currentTeamId, isHost }) => {
  if (!reviewSummary || reviewSummary.length === 0) return <div>No review data available.</div>;

  return (
    <div className="review-summary">
      <h2>Quiz Review Summary</h2>
      {reviewSummary.map((q, idx) => (
        <div key={q.questionId} className="review-question-block">
          <h3>Q{idx + 1}: {q.questionText}</h3>
          <div><strong>Correct Answer:</strong> {q.correctAnswerText}</div>
          {q.explanation && <div><em>{q.explanation}</em></div>}
          <table className="review-answers-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Answer</th>
                <th>Correct?</th>
              </tr>
            </thead>
            <tbody>
              {q.teamAnswers
                .filter(ans => isHost || ans.teamId === currentTeamId)
                .map(ans => (
                  <tr key={ans.teamId} className={ans.teamId === currentTeamId ? 'highlight' : ''}>
                    <td>{ans.teamName}</td>
                    <td>{ans.answerText}</td>
                    <td>{ans.answerId === q.correctAnswerId ? '✔️' : '❌'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default ReviewSummary;
