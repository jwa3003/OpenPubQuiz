import { useState } from 'react';

function QuizBuilder({ onQuizCreated, onCancel }) {
    const [quizName, setQuizName] = useState('');
    const [questions, setQuestions] = useState([]);

    // Add a new empty question
    const addQuestion = () => {
        setQuestions([...questions, { text: '', answers: [{ text: '', is_correct: false }] }]);
    };

    // Update question text
    const updateQuestionText = (index, text) => {
        const newQuestions = [...questions];
        newQuestions[index].text = text;
        setQuestions(newQuestions);
    };

    // Add answer to question
    const addAnswer = (qIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].answers.push({ text: '', is_correct: false });
        setQuestions(newQuestions);
    };

    // Update answer text
    const updateAnswerText = (qIndex, aIndex, text) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].answers[aIndex].text = text;
        setQuestions(newQuestions);
    };

    // Toggle correct answer checkbox
    const toggleCorrect = (qIndex, aIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].answers[aIndex].is_correct = !newQuestions[qIndex].answers[aIndex].is_correct;
        setQuestions(newQuestions);
    };

    // Remove answer
    const removeAnswer = (qIndex, aIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].answers.splice(aIndex, 1);
        setQuestions(newQuestions);
    };

    // Remove question
    const removeQuestion = (qIndex) => {
        const newQuestions = [...questions];
        newQuestions.splice(qIndex, 1);
        setQuestions(newQuestions);
    };

    // Save quiz and questions + answers to backend
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
            // 1. Create quiz
            const quizRes = await fetch('http://localhost:3001/api/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: quizName }),
            });
            if (!quizRes.ok) throw new Error('Failed to create quiz');
            const quizData = await quizRes.json();

            // 2. Add questions and answers
            for (const q of questions) {
                if (!q.text.trim()) continue;

                // Create question
                const questionRes = await fetch('http://localhost:3001/api/questions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quiz_id: quizData.id, text: q.text }),
                });
                if (!questionRes.ok) throw new Error('Failed to create question');
                const questionData = await questionRes.json();

                // Create answers
                for (const a of q.answers) {
                    if (!a.text.trim()) continue;
                    const answerRes = await fetch('http://localhost:3001/api/answers', {
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
