// components/common/AnswerList.jsx
import React from 'react';

function AnswerList({ answers, selectedAnswerId, onSelect }) {
  if (!answers || answers.length === 0) return null;
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {answers.map((ans) => (
        <li key={ans.id} style={{ marginBottom: '0.5rem' }}>
          <button
            onClick={() => onSelect(ans.id)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: selectedAnswerId === ans.id ? 'lightgreen' : '#f0f0f0',
              color: '#000',
              border: '1px solid #ccc',
              cursor: 'pointer',
            }}
          >
            {ans.text || '(no text)'}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default AnswerList;
