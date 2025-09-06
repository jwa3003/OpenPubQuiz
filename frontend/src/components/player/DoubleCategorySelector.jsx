
import React, { useEffect, useState } from 'react';
import socket from '../../socket';
const API_BASE = '/api';

export default function DoubleCategorySelector({ quiz, sessionId, doubleCategoryId, setDoubleCategoryId, doubleCategoryConfirmed, setDoubleCategoryConfirmed, floating }) {
  const [socketReady, setSocketReady] = useState(socket.connected);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    const handleConnect = () => setSocketReady(true);
    socket.on('connect', handleConnect);
    if (socket.connected) setSocketReady(true);
    return () => {
      socket.off('connect', handleConnect);
    };
  }, []);
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
        if (!doubleCategoryId || !socketReady || !socket.id) return;
        try {
          const res = await fetch(`${API_BASE}/double-category`, {
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
        <button type='submit' disabled={!doubleCategoryId || doubleCategoryConfirmed || !socketReady || !socket.id} style={{ padding: '0.3rem 1rem' }}>
          {doubleCategoryConfirmed ? 'Selected!' : (!socketReady ? 'Connecting...' : 'Confirm')}
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
