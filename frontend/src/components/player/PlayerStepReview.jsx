
import React, { useState, useEffect } from 'react';
import './PlayerStepReview.css';

function PlayerStepReview({ reviewQuestion, reviewIndex, reviewTotal, currentTeamId }) {
  const [phase, setPhase] = useState('splash'); // splash, answers, teams
  const [teamRevealIndex, setTeamRevealIndex] = useState(-1);
  const [splashAnim, setSplashAnim] = useState(false);
  const [answerAnim, setAnswerAnim] = useState(false);

  useEffect(() => {
    setPhase('splash');
    setTeamRevealIndex(-1);
    setSplashAnim(true);
    setAnswerAnim(false);
    const splashTimeout = setTimeout(() => {
      setSplashAnim(false);
      setTimeout(() => setPhase('answers'), 400); // allow fade out
    }, 1200);
    return () => clearTimeout(splashTimeout);
  }, [reviewQuestion]);

  useEffect(() => {
    if (phase === 'answers') {
      setTimeout(() => setAnswerAnim(true), 100);
    }
    if (phase === 'teams') {
      if (teamRevealIndex < reviewQuestion.teamAnswers.length - 1) {
        const t = setTimeout(() => setTeamRevealIndex(teamRevealIndex + 1), 900);
        return () => clearTimeout(t);
      }
    }
  }, [phase, teamRevealIndex, reviewQuestion]);

  if (!reviewQuestion) return <div>No review data.</div>;
  const myAnswer = reviewQuestion.teamAnswers.find(ans => ans.teamId === currentTeamId);

  // Splash screen like category
  if (phase === 'splash') {
    return (
      <div className={`review-splash${splashAnim ? ' splash-in' : ' splash-out'}`}>
        <div className="review-splash-label">Answer Reveal</div>
        <div className="review-splash-question">{reviewQuestion.questionText}</div>
      </div>
    );
  }

  // Show all possible answers, highlight correct
  if (phase === 'answers') {
    return (
      <div className="review-answers">
        <h2>Question</h2>
        <div className="review-answers-question">{reviewQuestion.questionText}</div>
        <ul className="review-answers-list">
          {reviewQuestion.allAnswers && reviewQuestion.allAnswers.map(ans => {
            const isCorrect = String(ans.id) === String(reviewQuestion.correctAnswerId);
            return (
              <li
                key={ans.id}
                className={`review-answer${isCorrect ? ' correct' : ''}${answerAnim && isCorrect ? ' reveal-anim' : ''}`}
              >
                {ans.text}
                {answerAnim && isCorrect && (
                  <span className="confetti">🎉</span>
                )}
              </li>
            );
          })}
        </ul>
        <button onClick={() => { setPhase('teams'); setTeamRevealIndex(0); }} className="review-next-btn">Show Team Results</button>
      </div>
    );
  }

  // Animated team reveal
  if (phase === 'teams') {
    return (
      <div className="review-teams">
        <h2>Team Results</h2>
        <div className="review-answers-question">{reviewQuestion.questionText}</div>
        <ul className="review-teams-list">
          {reviewQuestion.teamAnswers.map((ans, idx) => (
            <li
              key={ans.teamId}
              className={`review-team${idx <= teamRevealIndex ? ' revealed' : ''}${ans.isCorrect && idx <= teamRevealIndex ? ' correct' : idx <= teamRevealIndex ? ' incorrect' : ''}`}
            >
              <span className="review-team-name">{ans.teamName}:</span> <b>{ans.answerText || <em>No answer</em>}</b>
              <span className="review-team-icon">{idx <= teamRevealIndex ? (ans.isCorrect ? '✔️' : '❌') : ''}</span>
              {idx === teamRevealIndex && idx !== -1 && (
                <span className="team-reveal-anim">{ans.isCorrect ? '🎉' : ''}</span>
              )}
            </li>
          ))}
        </ul>
        <div className="review-teams-btns">
          <p style={{ color: myAnswer?.isCorrect ? '#4caf50' : '#f44336', fontWeight: 600, fontSize: '1.1rem' }}>
            Your answer: {myAnswer ? myAnswer.answerText : <em>No answer submitted</em>}
          </p>
          <p style={{ marginTop: 24, color: '#bbb' }}><em>Waiting for the host to continue...</em></p>
        </div>
      </div>
    );
  }

  return null;
}

export default PlayerStepReview;
