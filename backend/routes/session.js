// backend/routes/session.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

// Create a new session
router.post('/', (req, res) => {
    const { session_id, quiz_id } = req.body;
    if (!session_id || !quiz_id) {
        return res.status(400).json({ error: 'Missing session_id or quiz_id' });
    }

    db.get('SELECT * FROM quizzes WHERE id = ?', [quiz_id], (err, quiz) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        db.run(
            'INSERT INTO quiz_sessions (session_id, quiz_id) VALUES (?, ?)',
               [session_id, quiz_id],
               function (err) {
                   if (err) return res.status(500).json({ error: 'Database error' });
                   res.json({ success: true, session_id, quiz_id });
               }
        );
    });
});

// Get session by ID
router.get('/:session_id', (req, res) => {
    const { session_id } = req.params;
    db.get('SELECT * FROM quiz_sessions WHERE session_id = ?', [session_id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Session not found' });
        res.json(row);
    });
});

// Update session status
router.put('/:session_id', (req, res) => {
    const { session_id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Missing status' });

    db.run(
        'UPDATE quiz_sessions SET status = ? WHERE session_id = ?',
        [status, session_id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (this.changes === 0) return res.status(404).json({ error: 'Session not found' });
            res.json({ success: true });
        }
    );
});

export default router;
