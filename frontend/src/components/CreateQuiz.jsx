import { useState } from 'react';

function CreateQuiz({ onQuizCreated }) {
    const [quizName, setQuizName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!quizName.trim()) {
            setError('Quiz name cannot be empty');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Create the quiz first
            const quizRes = await fetch('http://localhost:3001/api/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: quizName }),
            });

            if (!quizRes.ok) {
                const errData = await quizRes.json();
                setError(errData.error || 'Failed to create quiz');
                setLoading(false);
                return;
            }

            const quizData = await quizRes.json();

            // Generate a session ID
            const sessionId = Math.random().toString(36).substring(2, 12).toUpperCase();

            // Create session for the new quiz
            const sessionRes = await fetch('http://localhost:3001/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, quiz_id: quizData.id }),
            });

            if (!sessionRes.ok) {
                const errData = await sessionRes.json();
                setError(errData.error || 'Failed to create session');
                setLoading(false);
                return;
            }

            setLoading(false);
            onQuizCreated(quizData.id, quizData.name, sessionId);
        } catch (err) {
            setError('Network error, please try again.');
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '1rem' }}>
        <h2>Create a New Quiz</h2>
        <input
        type="text"
        placeholder="Enter quiz name"
        value={quizName}
        onChange={(e) => setQuizName(e.target.value)}
        style={{ padding: '0.5rem', width: '300px' }}
        disabled={loading}
        />
        <br /><br />
        <button onClick={handleCreate} disabled={loading}>
        {loading ? 'Creating...' : 'Create Quiz & Start Session'}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}

export default CreateQuiz;
