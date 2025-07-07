# OpenPubQuiz Backend/Frontend Flow Notes

## Scoring and Quiz Flow (as of July 2025, post-refactor)

### Backend (handlers.js and modules)
- Teams join a session via `joinRoom`, tracked by `socket.id`.
- When a team selects an answer, they emit `answer-selected` (with `sessionId`, `teamId`).
- When a team submits an answer, they emit `submitAnswer` (with `sessionId`, `quizId`, `questionId`, `answerId`, `teamId`).
- The backend tracks which teams have selected and submitted answers using `selectedTeamsMap` and `answeredTeams`.
- When all teams have selected, the timer starts (5s by default, handled by `timerUtils.js`).
- When all teams have submitted, the timer starts (5s by default).
- When the timer ends, or all answers are in, `sendNextQuestion` is called.
- **Review Phase is now robustly integrated:**
  - Before advancing to the next question (or ending the quiz), `sendNextQuestion` checks if the review phase is enabled and if there are answers to review.
  - If so, it emits a `review-phase` event to all clients, with the correct answer, explanation, and all team answers.
  - The backend waits for the host to emit `end-review` before proceeding.
  - If it is the last question, the leaderboard and `quiz-ended` are only emitted after the review phase ends.
- Scoring is handled in the `submitAnswer` handler:
  - If the answer is correct, the backend checks if the team has selected the category for double points.
  - Points are awarded (1 or 2), and the leaderboard is updated (via `leaderboardUtils.js`).
- **Code is now modularized:** quiz logic, timer logic, and leaderboard logic are in separate files for maintainability.



### Review Phase (Robust Integration)
**Purpose:**
- Allow teams to review the correct answer after each question.
- Give the host control over when to proceed to the next question or end the quiz.

**Flow:**
1. After all answers are submitted (or timer ends), `sendNextQuestion` is called.
2. If there are answers to review and the review phase is enabled, backend emits a `review-phase` event to all clients (with correct answer, explanation, and all team answers for the previous question).
3. **Frontend (Player):**
   - Shows the correct answer and the team’s own answer.
4. **Frontend (Host):**
   - Sees all team answers and the correct answer.
   - Has a “Next Question” or “End Review” button to proceed.
5. **Backend:**
   - Waits for host to emit `end-review` before advancing to the next question or ending the quiz.
6. If it is the last question, the leaderboard and `quiz-ended` are only emitted after the review phase ends.

**Data/Events:**
- `review-phase` (backend → all):
  - `{ questionId, correctAnswerId, correctAnswerText, explanation, allTeamAnswers: [{ teamId, teamName, answerId, answerText }] }`
- `end-review` (host → backend):
  - `{ sessionId }`
- `review-ended` (backend → all):
  - Signals to proceed to the next question or end the quiz.

**UI/UX:**
- **Players:** See their answer and the correct answer.
- **Host:** Sees all team answers, the correct answer, and controls when to move on.

**Backend/Frontend Contract:**
- All new events and payloads are clearly defined above for implementation.

**Edge Cases:**
- If the timer ends before all teams submit, only the submitted answers are shown in the review phase.
- If a team disconnects before submitting, their answer will not appear in the review phase.

### Team/Player Tracking
- Teams are tracked by `socket.id` (not a persistent teamId).
- `teamNames` and `scores` are keyed by `socket.id`.
- If a player disconnects and reconnects, they are treated as a new team.

### Frontend
- Teams emit `answer-selected` when they pick an answer.
- Teams emit `submitAnswer` when they submit (usually when timer runs out or when they press a button).
- The host controls quiz start and can advance questions.
- The frontend expects to receive events like `new-question`, `score-update`, `final-leaderboard`, etc.
- **Code is now modularized:** large components (`HostQuiz.jsx`, `PlayQuiz.jsx`) use subcomponents (`Leaderboard`, `QuestionDisplay`, `Timer`, `AnswerList`) for clarity and reuse.

## Refactor & Cleanup Summary (July 2025)
- Backend socket logic split into `handlers.js`, `timerUtils.js`, `leaderboardUtils.js`, and `quizHandlers.js`.
- Frontend large components split into smaller subcomponents for maintainability.
- Unused files and placeholder READMEs removed for a cleaner codebase.

## TODO/Questions
- Should teams be tracked by a persistent teamId (not socket.id)?
- Should the review phase be re-implemented?
- Should the backend handle answer submission automatically on timer, or only when teams emit `submitAnswer`?
- Should the frontend always emit `submitAnswer` when the timer runs out?

## Notes
- The current flow is: select answer → submit answer (by team or timer) → backend scores → next question.
- If you want auto-submission, the frontend must emit `submitAnswer` for each team when the timer ends.
- If you want persistent teams, use a teamId not tied to socket.id.

---

Add more notes here as you explore the project.
