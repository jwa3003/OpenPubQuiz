// backend/routes/session.js
import express from 'express';
import db from '../db.js';
import { nanoid } from 'nanoid';

let io = null;
export function registerSocketIO(ioInstance) {
    io = ioInstance;
}

const router = express.Router();

// Create a new session
router.post('/', (req, res) => {
    let { session_id, quiz_id = null } = req.body;

    if (!session_id) {
        session_id = nanoid(4).toUpperCase();
    }

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

// Get session info
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

// Update session quiz_id or status
router.put('/:session_id', (req, res) => {
    const { session_id } = req.params;
    const { quiz_id, status } = req.body;

    if (typeof quiz_id === 'undefined' && typeof status === 'undefined') {
        return res.status(400).json({ error: 'No quiz_id or status provided to update' });
    }

    const fields = [];
    const values = [];

    if (typeof quiz_id !== 'undefined') {
        fields.push('quiz_id = ?');
        values.push(quiz_id);
    }
    if (typeof status !== 'undefined') {
        fields.push('status = ?');
        values.push(status);
    }

    values.push(session_id);

    const sql = `UPDATE quiz_sessions SET ${fields.join(', ')} WHERE session_id = ?`;

    db.run(sql, values, function (err) {
        if (err) {
            console.error('❌ Failed to update session:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // ✅ If quiz was updated, notify players in the room
        if (quiz_id && io) {
            db.get('SELECT name FROM quizzes WHERE id = ?', [quiz_id], (err, quiz) => {
                if (!err && quiz) {
                    io.to(`session-${session_id}`).emit('quiz-loaded', {
                        quizId: quiz_id,
                        quizName: quiz.name,
                    });
                }
            });
        }

        res.json({ success: true });
    });
});

// Delete quiz from session
router.delete('/:session_id/quiz', (req, res) => {
    const { session_id } = req.params;

    const sql = 'UPDATE quiz_sessions SET quiz_id = NULL WHERE session_id = ?';
    db.run(sql, [session_id], function (err) {
        if (err) {
            console.error('❌ Failed to remove quiz from session:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // 🔕 (optional) Emit to players that quiz was removed

        res.json({ success: true, message: 'Quiz removed from session' });
    });
});

export default router;
