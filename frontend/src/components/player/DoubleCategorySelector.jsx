import React from 'react';
import socket from '../../socket';
const API_BASE = `http://${window.location.hostname}:3001`;

export default function DoubleCategorySelector({ quiz, sessionId, doubleCategoryId, setDoubleCategoryId, doubleCategoryConfirmed, setDoubleCategoryConfirmed, floating }) {
  if (!quiz || !quiz.categories) return null;
  return (
    <div style={{
      margin: floating ? '1.5rem 0' : undefined,
      padding: floating ? '1rem' : undefined,
      border: floating ? '1px solid #eee' : undefined,
      background: floating ? '#f9f9f9' : undefined,
      borderRadius: floating ? '8px' : undefined,
      maxWidth: 400,
      position: floating ? 'fixed' : undefined,
      top: floating ? 20 : undefined,
      right: floating ? 20 : undefined,
      zIndex: floating ? 100 : undefined
    }}>
      <h4>Select your Double-Points Category:</h4>
      <form onSubmit={async (e) => {
        e.preventDefault();
        if (!doubleCategoryId) return;
        try {
          const res = await fetch(`${API_BASE}/api/double-category`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              team_id: socket.id,
              category_id: doubleCategoryId
            })
          });
          if (res.ok) setDoubleCategoryConfirmed(true);
        } catch {}
      }}>
        <select
          value={doubleCategoryId || ''}
          onChange={e => {
            setDoubleCategoryId(Number(e.target.value));
            setDoubleCategoryConfirmed(false);
          }}
          required
          style={{ fontSize: '1rem', padding: '0.3rem', marginRight: '1rem' }}
        >
          <option value='' disabled>Select a category</option>
          {quiz.categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <button type='submit' disabled={!doubleCategoryId || doubleCategoryConfirmed} style={{ padding: '0.3rem 1rem' }}>
          {doubleCategoryConfirmed ? 'Selected!' : 'Confirm'}
        </button>
      </form>
      {doubleCategoryConfirmed && (
        <div style={{ color: 'green', marginTop: '0.5rem' }}>
          Double-points category selected!
        </div>
      )}
    </div>
  );
}
