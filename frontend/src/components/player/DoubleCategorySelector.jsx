import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = '/api';

function DoubleCategorySelector({ quiz, sessionId, doubleCategoryId, setDoubleCategoryId, doubleCategoryConfirmed, setDoubleCategoryConfirmed, floating }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSelect = (e) => {
    setDoubleCategoryId(Number(e.target.value));
    setError(null);
  };

  const handleConfirm = async () => {
    if (!doubleCategoryId) {
      setError('Please select a category.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Get teamId from localStorage
      const teamId = localStorage.getItem('teamId');
      await axios.post(`${API_BASE}/double-category`, {
        session_id: sessionId,
        team_id: teamId,
        category_id: doubleCategoryId,
      });
      setDoubleCategoryConfirmed(true);
    } catch (err) {
      setError('Failed to submit selection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (doubleCategoryConfirmed) {
    const selectedCat = quiz.categories.find(c => c.id === doubleCategoryId);
    return (
      <div style={{ margin: '1rem 0', background: '#1e3a5c', color: '#fff', padding: 16, borderRadius: 10, boxShadow: '0 2px 8px #0003', fontWeight: 600 }}>
        <strong>Double-points category selected:</strong> {selectedCat ? selectedCat.name : 'Unknown'}
      </div>
    );
  }

  return (
    <div style={{
      margin: floating ? '1rem' : '2rem 0',
      background: '#18324a',
      color: '#fff',
      padding: 22,
      borderRadius: 12,
      boxShadow: '0 2px 12px #0004',
      maxWidth: 420,
      fontWeight: 500
    }}>
      <h3 style={{ marginBottom: 14, color: '#ffd700', textShadow: '0 2px 8px #000a' }}>Select your double-points category:</h3>
      <select
        value={doubleCategoryId || ''}
        onChange={handleSelect}
        disabled={submitting}
        style={{
          minWidth: 220,
          padding: '8px 12px',
          borderRadius: 6,
          border: '2px solid #ffd700',
          background: '#fff',
          color: '#18324a',
          fontWeight: 600,
          fontSize: 16,
          marginBottom: 12
        }}
      >
        <option value="">-- Choose a category --</option>
        {quiz.categories.map(cat => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>
      <button
        onClick={handleConfirm}
        disabled={submitting || !doubleCategoryId}
        style={{
          marginLeft: 16,
          padding: '8px 18px',
          borderRadius: 6,
          border: 'none',
          background: '#ffd700',
          color: '#18324a',
          fontWeight: 700,
          fontSize: 16,
          boxShadow: '0 1px 4px #0002',
          cursor: submitting || !doubleCategoryId ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s'
        }}
      >
        Confirm
      </button>
      {error && <div style={{ color: '#ffb3b3', marginTop: 10, fontWeight: 600 }}>{error}</div>}
    </div>
  );
}

export default DoubleCategorySelector;
