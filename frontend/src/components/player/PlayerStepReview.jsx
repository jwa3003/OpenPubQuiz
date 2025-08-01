// Helper to get full image URL (match PlayQuiz/HostStepReview logic)
const API_BASE = `http://${window.location.hostname}:3001`;
const getImageUrl = (url) => url ? `${API_BASE}${url}` : null;

import React, { useState, useEffect } from 'react';
import socket from '../../socket';
import './PlayerStepReview.css';


function PlayerStepReview({ reviewQuestion, reviewIndex, reviewTotal, currentTeamId, reviewStep }) {
  // Remove phase state; use reviewStep directly
  const [teamRevealIndex, setTeamRevealIndex] = useState(-1);
  const [splashAnim, setSplashAnim] = useState(false);
  const [answerAnim, setAnswerAnim] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);

  // Reset animation and reveal state on new question or reviewStep
  useEffect(() => {
    setTeamRevealIndex(-1);
    setSplashAnim(false);
    setAnswerAnim(false);
    setShowCorrect(false);
    if (reviewStep === 0) {
      setSplashAnim(true);
      const splashTimeout = setTimeout(() => setSplashAnim(false), 1200);
      return () => clearTimeout(splashTimeout);
    }
    if (reviewStep === 1) {
      setTimeout(() => setAnswerAnim(true), 100);
      // Reveal correct answer after 1.2s
      const t = setTimeout(() => setShowCorrect(true), 1200);
      return () => clearTimeout(t);
    }
    if (reviewStep === 2) {
      setTeamRevealIndex(0);
    }
  }, [reviewQuestion, reviewStep]);

  // Animate team reveal in teams phase
  useEffect(() => {
    if (reviewStep === 2 && teamRevealIndex < reviewQuestion.teamAnswers.length - 1) {
      const t = setTimeout(() => setTeamRevealIndex(teamRevealIndex + 1), 900);
      return () => clearTimeout(t);
    }
  }, [reviewStep, teamRevealIndex, reviewQuestion]);

  // Listen for socket event from backend to reveal correct answer (host-driven)
  useEffect(() => {
    function onReviewStep({ reviewStep }) {
      setShowCorrect(reviewStep >= 1);
    }
    socket.on('review-step', onReviewStep);
    return () => socket.off('review-step', onReviewStep);
  }, []);

  // Animate answer and team reveal based on reviewStep
  useEffect(() => {
    if (reviewStep === 1) {
      setTimeout(() => setAnswerAnim(true), 100);
    }
    if (reviewStep === 2 && teamRevealIndex < reviewQuestion.teamAnswers.length - 1) {
      const t = setTimeout(() => setTeamRevealIndex(teamRevealIndex + 1), 900);
      return () => clearTimeout(t);
    }
  }, [reviewStep, teamRevealIndex, reviewQuestion]);

  if (!reviewQuestion) return <div>No review data.</div>;
  const myAnswer = reviewQuestion.teamAnswers.find(ans => ans.teamId === currentTeamId);


  // Splash screen
  if (reviewStep === 0) {
    return (
      <div className={`review-splash${splashAnim ? ' splash-in' : ' splash-out'}`}>
        <div className="review-splash-label">Answer Reveal</div>
        {reviewQuestion.categoryImageUrl && (
          <img src={reviewQuestion.categoryImageUrl} alt="Category" style={{ maxWidth: 180, maxHeight: 120, margin: '0.5rem auto', display: 'block', borderRadius: 8, border: '2px solid #fff', boxShadow: '0 2px 8px #0002' }} />
        )}
        <div className="review-splash-question">{reviewQuestion.questionText}</div>
      </div>
    );
  }

  // Show all possible answers, highlight correct ONLY when host advances (no button for player)
  if (reviewStep === 1) {
    return (
      <div className="review-answers">
        <h2>Question</h2>
        {reviewQuestion.image_url && (
          <img
            src={getImageUrl(reviewQuestion.image_url)}
            alt="Question"
            style={{
              maxWidth: '90vw',
              width: '100%',
              maxHeight: 240,
              marginBottom: 24,
              borderRadius: 18,
              boxShadow: '0 4px 32px #000a',
              objectFit: 'contain',
              background: '#222',
              padding: 8
            }}
          />
        )}
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
        {/* No button for player; host controls reveal and phase */}
      </div>
    );
  }

  // Animated team reveal
  if (reviewStep === 2) {
    const myAnswer = reviewQuestion.teamAnswers.find(ans => ans.teamId === currentTeamId);
    return (
      <div className="review-teams">
        <h2>Team Results</h2>
        {reviewQuestion.image_url && (
          <img
            src={getImageUrl(reviewQuestion.image_url)}
            alt="Question"
            style={{
              maxWidth: '90vw',
              width: '100%',
              maxHeight: 240,
              marginBottom: 24,
              borderRadius: 18,
              boxShadow: '0 4px 32px #000a',
              objectFit: 'contain',
              background: '#222',
              padding: 8
            }}
          />
        )}
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
