import { useState } from 'react';

const API_BASE = `http://${window.location.hostname}:3001`;

function QuizBuilder({ onQuizCreated, onCancel }) {
    const [quizName, setQuizName] = useState('');
    const [questions, setQuestions] = useState([]);

    const addQuestion = () => {
        setQuestions([...questions, { text: '', answers: [{ text: '', is_correct: false }] }]);
    };

    const updateQuestionText = (index, text) => {
        const newQuestions = [...questions];
        newQuestions[index].text = text;
        setQuestions(newQuestions);
    };

    const addAnswer = (qIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].answers.push({ text: '', is_correct: false });
        setQuestions(newQuestions);
    };

    const updateAnswerText = (qIndex, aIndex, text) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].answers[aIndex].text = text;
        setQuestions(newQuestions);
    };

    const toggleCorrect = (qIndex, aIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].answers[aIndex].is_correct = !newQuestions[qIndex].answers[aIndex].is_correct;
        setQuestions(newQuestions);
    };

    const removeAnswer = (qIndex, aIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].answers.splice(aIndex, 1);
        setQuestions(newQuestions);
    };

    const removeQuestion = (qIndex) => {
        const newQuestions = [...questions];
        newQuestions.splice(qIndex, 1);
        setQuestions(newQuestions);
    };

    const saveQuiz = async () => {
        if (!quizName.trim()) {
            alert('Quiz name is required');
            return;
        }
        if (questions.length === 0) {
            alert('Add at least one question');
            return;
        }

        try {
            const quizRes = await fetch(`${API_BASE}/api/quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: quizName }),
            });
            if (!quizRes.ok) throw new Error('Failed to create quiz');
            const quizData = await quizRes.json();

            for (const q of questions) {
                if (!q.text.trim()) continue;

                const questionRes = await fetch(`${API_BASE}/api/questions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quiz_id: quizData.id, text: q.text }),
                });
                if (!questionRes.ok) throw new Error('Failed to create question');
                const questionData = await questionRes.json();

                for (const a of q.answers) {
                    if (!a.text.trim()) continue;
                    const answerRes = await fetch(`${API_BASE}/api/answers`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ question_id: questionData.id, text: a.text, is_correct: a.is_correct }),
                    });
                    if (!answerRes.ok) throw new Error('Failed to create answer');
                }
            }

            onQuizCreated(quizData.id, quizName);
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    return (
        <div style={{ padding: '1rem', border: '1px solid #ccc', marginTop: '1rem' }}>
        <h3>Create New Quiz</h3>
        <label>
        Quiz Name:{' '}
        <input
        type="text"
        value={quizName}
        onChange={(e) => setQuizName(e.target.value)}
        placeholder="Enter quiz name"
        />
        </label>

        <div style={{ marginTop: '1rem' }}>
        <h4>Questions</h4>
        {questions.map((q, qIndex) => (
            <div key={qIndex} style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #ddd' }}>
            <label>
            Question {qIndex + 1}:{' '}
            <input
            type="text"
            value={q.text}
            onChange={(e) => updateQuestionText(qIndex, e.target.value)}
            placeholder="Enter question text"
            style={{ width: '90%' }}
            />
            </label>
            <button
            onClick={() => removeQuestion(qIndex)}
            style={{ marginLeft: '0.5rem', color: 'red' }}
            title="Remove question"
            >
            ✖
            </button>

            <div style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
            <h5>Answers</h5>
            {q.answers.map((a, aIndex) => (
                <div key={aIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.3rem' }}>
                <input
                type="text"
                value={a.text}
                onChange={(e) => updateAnswerText(qIndex, aIndex, e.target.value)}
                placeholder="Answer text"
                style={{ flexGrow: 1 }}
                />
                <label style={{ marginLeft: '0.5rem' }}>
                Correct{' '}
                <input
                type="checkbox"
                checked={a.is_correct}
                onChange={() => toggleCorrect(qIndex, aIndex)}
                />
                </label>
                <button
                onClick={() => removeAnswer(qIndex, aIndex)}
                style={{ marginLeft: '0.5rem', color: 'red' }}
                title="Remove answer"
                >
                ✖
                </button>
                </div>
            ))}

            <button onClick={() => addAnswer(qIndex)} style={{ marginTop: '0.5rem' }}>
            + Add Answer
            </button>
            </div>
            </div>
        ))}

        <button onClick={addQuestion} style={{ marginTop: '1rem' }}>
        + Add Question
        </button>
        </div>

        <div style={{ marginTop: '1rem' }}>
        <button onClick={saveQuiz} style={{ marginRight: '1rem' }}>
        Save Quiz
        </button>
        <button onClick={onCancel}>Cancel</button>
        </div>
        </div>
    );
}

export default QuizBuilder;
