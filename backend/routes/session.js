import express from 'express';
import db from '../db.js';
import { nanoid } from 'nanoid';

const router = express.Router();

// Create a new session (quiz_id is optional)
router.post('/', (req, res) => {
    let { session_id, quiz_id = null } = req.body;

    // If session_id not provided, generate a short one
    if (!session_id) {
        session_id = nanoid(4).toUpperCase(); // 4-char code
    }

    // If quiz_id is provided, validate it exists
    const insertSession = () => {
        const query = 'INSERT INTO quiz_sessions (session_id, quiz_id) VALUES (?, ?)';
        db.run(query, [session_id, quiz_id], function (err) {
            if (err) {
                console.error('❌ Failed to insert session:', err.message);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, session_id, quiz_id });
        });
    };

    if (quiz_id) {
        db.get('SELECT * FROM quizzes WHERE id = ?', [quiz_id], (err, quiz) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
            insertSession();
        });
    } else {
        insertSession();
    }
});

// Get session info by session_id
router.get('/:session_id', (req, res) => {
    const { session_id } = req.params;

    const query = `
    SELECT qs.session_id, qs.quiz_id, q.name as quiz_name
    FROM quiz_sessions qs
    LEFT JOIN quizzes q ON qs.quiz_id = q.id
    WHERE qs.session_id = ?
    `;

    db.get(query, [session_id], (err, row) => {
        if (err) {
            console.error('❌ Failed to fetch session:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
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
