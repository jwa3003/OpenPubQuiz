
import React, { useState, useEffect } from 'react';
import './HostStepReview.css';


function HostStepReview({ reviewQuestion, reviewIndex, reviewTotal, reviewStep, onNext, onEnd, isHost = true }) {
  // reviewStep: 0 = splash, 1 = answers, 2 = teams
  const [teamRevealIndex, setTeamRevealIndex] = useState(-1);
  const [splashAnim, setSplashAnim] = useState(false);
  const [answerAnim, setAnswerAnim] = useState(false);
  // New: control when to show correct answer
  const [showCorrect, setShowCorrect] = useState(false);

  // Debug label for current step
  let debugLabel = '';
  if (reviewStep === 0) debugLabel = 'DEBUG: reviewStep=0 (Splash)';
  else if (reviewStep === 1) debugLabel = 'DEBUG: reviewStep=1 (Answers)';
  else if (reviewStep === 2) debugLabel = 'DEBUG: reviewStep=2 (Teams)';

  useEffect(() => {
    setTeamRevealIndex(-1);
    setSplashAnim(false);
    setAnswerAnim(false);
    setShowCorrect(false); // Reset correct answer highlight on step change
    if (reviewStep === 0) {
      setSplashAnim(true);
      // Auto-advance after splash for host only
      const splashTimeout = setTimeout(() => {
        setSplashAnim(false);
        if (isHost && typeof onNext === 'function') {
          onNext();
        }
      }, 1200);
      return () => clearTimeout(splashTimeout);
    }
    if (reviewStep === 1) {
      setTimeout(() => setAnswerAnim(true), 100);
    }
    if (reviewStep === 2) {
      setTeamRevealIndex(0);
    }
  }, [reviewQuestion, reviewStep, isHost, onNext]);

  useEffect(() => {
    if (reviewStep === 2 && teamRevealIndex < reviewQuestion.teamAnswers.length - 1) {
      const t = setTimeout(() => setTeamRevealIndex(teamRevealIndex + 1), 900);
      return () => clearTimeout(t);
    }
  }, [reviewStep, teamRevealIndex, reviewQuestion]);

  if (!reviewQuestion) return <div>No review data.</div>;


  // Always show debug label at top right
  const debugMsg = (
    <div style={{position:'fixed',top:8,right:16,fontSize:'1rem',opacity:0.7,zIndex:2000,pointerEvents:'none'}}>{debugLabel}</div>
  );

  // Only show splash overlay during splash phase
  const splashOverlay = (reviewStep === 0 && splashAnim) ? (
    <div className={`review-splash splash-in`}>
      <div className="review-splash-label">Answer Reveal</div>
      <div className="review-splash-question">{reviewQuestion.questionText}</div>
    </div>
  ) : null;

  // Auto-reveal correct answer after 1.2s (same as splash), but only for reviewStep 1
  useEffect(() => {
    if (reviewStep === 1) {
      const t = setTimeout(() => setShowCorrect(true), 1200);
      return () => clearTimeout(t);
    }
  }, [reviewQuestion, reviewStep]);

  if (reviewStep === 0 || reviewStep === 1) {
    return (
      <>
        {debugMsg}
        <div className="review-answers">
          <h2>Question</h2>
          <div className="review-answers-question">{reviewQuestion.questionText}</div>
          <ul className="review-answers-list">
            {reviewQuestion.allAnswers && reviewQuestion.allAnswers.map(ans => {
              const isCorrect = String(ans.id) === String(reviewQuestion.correctAnswerId);
              return (
                <li
                  key={ans.id}
                  className={`review-answer${showCorrect && isCorrect ? ' correct' : ''}${showCorrect && answerAnim && isCorrect ? ' reveal-anim' : ''}`}
                >
                  {ans.text}
                  {showCorrect && answerAnim && isCorrect && (
                    <span className="confetti">🎉</span>
                  )}
                </li>
              );
            })}
          </ul>
          {isHost && showCorrect && (
            <button onClick={onNext} className="review-next-btn">Show Team Results</button>
          )}
        </div>
        {splashOverlay}
      </>
    );
  }

  // Animated team reveal
  if (reviewStep === 2) {
    return (
      <>
        {debugMsg}
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
          {isHost ? (
            <div className="review-teams-btns">
              {teamRevealIndex < reviewQuestion.teamAnswers.length - 1 ? (
                <button onClick={() => setTeamRevealIndex(teamRevealIndex + 1)} className="review-next-btn">Reveal Next Team</button>
              ) : (
                reviewIndex < reviewTotal - 1 ? (
                  <button onClick={onNext} className="review-next-btn">Next</button>
                ) : (
                  <button onClick={onEnd} className="review-end-btn">End Review / Show Leaderboard</button>
                )
              )}
            </div>
          ) : null}
        </div>
      </>
    );
  }

  // Fallback: show debug info if reviewStep is not handled
  return (
    <div style={{ padding: 32, color: '#fff', background: '#b71c1c', borderRadius: 12, margin: '2rem auto', maxWidth: 700 }}>
      <h2>Review Phase Error</h2>
      <p>Nothing to display for reviewStep: <b>{String(reviewStep)}</b></p>
      <pre>{JSON.stringify({ reviewQuestion, reviewIndex, reviewTotal, teamRevealIndex, splashAnim, answerAnim, showCorrect }, null, 2)}</pre>
    </div>
  );
}

export default HostStepReview;
