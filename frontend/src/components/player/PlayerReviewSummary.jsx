import React from 'react';
import ReviewSummary from '../common/ReviewSummary';

function PlayerReviewSummary({ reviewSummary, currentTeamId }) {
  return (
    <div style={{ padding: 24, background: '#232a36', color: '#fff', borderRadius: 12, maxWidth: 700, margin: '2rem auto' }}>
      <h2>Quiz Review</h2>
      <ReviewSummary reviewSummary={reviewSummary} currentTeamId={currentTeamId} isHost={false} />
    </div>
  );
}

export default PlayerReviewSummary;
