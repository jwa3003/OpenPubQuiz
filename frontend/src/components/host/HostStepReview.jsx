
import React, { useState, useEffect } from 'react';
import './HostStepReview.css';

function HostStepReview({ reviewQuestion, reviewIndex, reviewTotal, reviewStep, onNext, onEnd, isHost = true }) {
  // reviewStep: 0 = splash, 1 = answers, 2 = teams
  const [teamRevealIndex, setTeamRevealIndex] = useState(-1);
  const [splashAnim, setSplashAnim] = useState(false);
  const [answerAnim, setAnswerAnim] = useState(false);

  // Debug label for current step
  let debugLabel = '';
  if (reviewStep === 0) debugLabel = 'DEBUG: reviewStep=0 (Splash)';
  else if (reviewStep === 1) debugLabel = 'DEBUG: reviewStep=1 (Answers)';
  else if (reviewStep === 2) debugLabel = 'DEBUG: reviewStep=2 (Teams)';

  useEffect(() => {
    setTeamRevealIndex(-1);
    setSplashAnim(false);
    setAnswerAnim(false);
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

  // Splash screen like category
  if (reviewStep === 0) {
    return (
      <>
        {debugMsg}
        {/* Only the background and label/question are animated */}
        <div className={`review-splash${splashAnim ? ' splash-in' : ' splash-out'}`}>
          <div className="review-splash-label">Answer Reveal</div>
          <div className="review-splash-question">{reviewQuestion.questionText}</div>
        </div>
        {/* No Next button needed; auto-advance for host */}
      </>
    );
  }

  // Show all possible answers, highlight correct
  if (reviewStep === 1) {
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
          {isHost && (
            <button onClick={onNext} className="review-next-btn">Show Team Results</button>
          )}
        </div>
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

  return null;
}

export default HostStepReview;
