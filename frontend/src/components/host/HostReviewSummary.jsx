import React from 'react';
import ReviewSummary from '../common/ReviewSummary';

function HostReviewSummary({ reviewSummary, onEndReview }) {
  return (
    <div style={{ padding: 24, background: '#232a36', color: '#fff', borderRadius: 12, maxWidth: 900, margin: '2rem auto' }}>
      <h2>Quiz Review (Host View)</h2>
      <ReviewSummary reviewSummary={reviewSummary} isHost={true} />
      <button onClick={onEndReview} style={{ marginTop: 24, fontSize: '1.1rem', padding: '8px 24px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>End Review / Show Leaderboard</button>
    </div>
  );
}

export default HostReviewSummary;
