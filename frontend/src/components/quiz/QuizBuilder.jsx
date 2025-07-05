import { useState } from 'react';

const API_BASE = `http://${window.location.hostname}:3001`;

function QuizBuilder({ onQuizCreated, onCancel, initialQuizData = null, editMode = false }) {
    // If editing, initialize state from initialQuizData
    const [quizName, setQuizName] = useState(initialQuizData?.quiz?.name || '');
    const [categories, setCategories] = useState(
        initialQuizData?.categories
            ? initialQuizData.categories.map(cat => ({
                name: cat.name,
                questions: (cat.questions || []).map(q => ({
                    text: q.text,
                    answers: (q.answers || []).map(a => ({ text: a.text, is_correct: !!a.is_correct }))
                }))
            }))
            : []
    );

    const addCategory = () => {
        setCategories([...categories, { name: '', questions: [] }]);
    };

    const updateCategoryName = (index, name) => {
        const newCategories = [...categories];
        newCategories[index].name = name;
        setCategories(newCategories);
    };

    const removeCategory = (index) => {
        const newCategories = [...categories];
        newCategories.splice(index, 1);
        setCategories(newCategories);
    };

    const addQuestion = (catIndex) => {
        const newCategories = [...categories];
        newCategories[catIndex].questions.push({ text: '', answers: [{ text: '', is_correct: false }] });
        setCategories(newCategories);
    };

    const updateQuestionText = (catIndex, qIndex, text) => {
        const newCategories = [...categories];
        newCategories[catIndex].questions[qIndex].text = text;
        setCategories(newCategories);
    };

    const updateQuestionCategory = (qIndex, catIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].categoryIndex = catIndex;
        setQuestions(newQuestions);
    };

    const addAnswer = (catIndex, qIndex) => {
        const newCategories = [...categories];
        newCategories[catIndex].questions[qIndex].answers.push({ text: '', is_correct: false });
        setCategories(newCategories);
    };

    const updateAnswerText = (catIndex, qIndex, aIndex, text) => {
        const newCategories = [...categories];
        newCategories[catIndex].questions[qIndex].answers[aIndex].text = text;
        setCategories(newCategories);
    };

    const toggleCorrect = (catIndex, qIndex, aIndex) => {
        const newCategories = [...categories];
        const ans = newCategories[catIndex].questions[qIndex].answers[aIndex];
        ans.is_correct = !ans.is_correct;
        setCategories(newCategories);
    };

    const removeAnswer = (catIndex, qIndex, aIndex) => {
        const newCategories = [...categories];
        newCategories[catIndex].questions[qIndex].answers.splice(aIndex, 1);
        setCategories(newCategories);
    };

    const removeQuestion = (catIndex, qIndex) => {
        const newCategories = [...categories];
        newCategories[catIndex].questions.splice(qIndex, 1);
        setCategories(newCategories);
    };

    const saveQuiz = async () => {
        if (!quizName.trim()) {
            alert('Quiz name is required');
            return;
        }
        if (categories.length === 0) {
            alert('Add at least one category');
            return;
        }
        if (categories.some(cat => !cat.name.trim())) {
            alert('All categories must have a name');
            return;
        }
        if (categories.every(cat => !cat.questions || cat.questions.length === 0)) {
            alert('Add at least one question in a category');
            return;
        }
        for (const cat of categories) {
            if (cat.questions && cat.questions.some(q => !q.text.trim())) {
                alert('All questions must have text');
                return;
            }
        }

        try {
            let quizId;
            if (editMode && initialQuizData?.quiz?.id) {
                // Update quiz name
                const quizRes = await fetch(`${API_BASE}/api/quiz/${initialQuizData.quiz.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: quizName }),
                });
                if (!quizRes.ok) throw new Error('Failed to update quiz');
                quizId = initialQuizData.quiz.id;
            } else {
                // Create new quiz
                const quizRes = await fetch(`${API_BASE}/api/quiz`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: quizName }),
                });
                if (!quizRes.ok) throw new Error('Failed to create quiz');
                const quizData = await quizRes.json();
                quizId = quizData.id;
            }

            // Categories
            const categoryIds = [];
            for (let cIndex = 0; cIndex < categories.length; ++cIndex) {
                const cat = categories[cIndex];
                let categoryId;
                if (editMode && initialQuizData?.categories?.[cIndex]?.id) {
                    // Update category
                    const catRes = await fetch(`${API_BASE}/api/categories/${initialQuizData.categories[cIndex].id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: cat.name }),
                    });
                    if (!catRes.ok) throw new Error('Failed to update category');
                    categoryId = initialQuizData.categories[cIndex].id;
                } else {
                    // Create new category
                    const catRes = await fetch(`${API_BASE}/api/categories`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ quiz_id: quizId, name: cat.name }),
                    });
                    if (!catRes.ok) throw new Error('Failed to create category');
                    const catData = await catRes.json();
                    categoryId = catData.id;
                }
                categoryIds.push(categoryId);
            }

            // Questions and Answers
            for (let cIndex = 0; cIndex < categories.length; ++cIndex) {
                const cat = categories[cIndex];
                const categoryId = categoryIds[cIndex];
                for (let qIndex = 0; qIndex < cat.questions.length; ++qIndex) {
                    const q = cat.questions[qIndex];
                    let questionId;
                    if (editMode && initialQuizData?.categories?.[cIndex]?.questions?.[qIndex]?.id) {
                        // Update question
                        const questionRes = await fetch(`${API_BASE}/api/questions/${initialQuizData.categories[cIndex].questions[qIndex].id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: q.text }),
                        });
                        if (!questionRes.ok) throw new Error('Failed to update question');
                        questionId = initialQuizData.categories[cIndex].questions[qIndex].id;
                    } else {
                        // Create new question
                        const questionRes = await fetch(`${API_BASE}/api/questions`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ quiz_id: quizId, text: q.text, category_id: categoryId }),
                        });
                        if (!questionRes.ok) throw new Error('Failed to create question');
                        const questionData = await questionRes.json();
                        questionId = questionData.id;
                    }

                    // Answers
                    for (let aIndex = 0; aIndex < q.answers.length; ++aIndex) {
                        const a = q.answers[aIndex];
                        if (!a.text.trim()) continue;
                        if (editMode && initialQuizData?.categories?.[cIndex]?.questions?.[qIndex]?.answers?.[aIndex]?.id) {
                            // Update answer
                            const answerRes = await fetch(`${API_BASE}/api/answers/${initialQuizData.categories[cIndex].questions[qIndex].answers[aIndex].id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: a.text, is_correct: a.is_correct }),
                            });
                            if (!answerRes.ok) throw new Error('Failed to update answer');
                        } else {
                            // Create new answer
                            const answerRes = await fetch(`${API_BASE}/api/answers`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ question_id: questionId, text: a.text, is_correct: a.is_correct }),
                            });
                            if (!answerRes.ok) throw new Error('Failed to create answer');
                        }
                    }
                }
            }

            onQuizCreated(quizId, quizName);
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
        <h4>Categories</h4>
        {categories.map((cat, cIndex) => (
            <div key={cIndex} style={{ border: '1px solid #bbb', marginBottom: '1rem', padding: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <input
                        type="text"
                        value={cat.name}
                        onChange={e => updateCategoryName(cIndex, e.target.value)}
                        placeholder="Category name"
                        style={{ flexGrow: 1 }}
                    />
                    <button
                        onClick={() => removeCategory(cIndex)}
                        style={{ marginLeft: '0.5rem', color: 'red' }}
                        title="Remove category"
                    >✖</button>
                </div>
                <div style={{ marginLeft: '1rem' }}>
                    <h5>Questions</h5>
                    {(cat.questions || []).map((q, qIndex) => (
                        <div key={qIndex} style={{ marginBottom: '0.5rem', padding: '0.5rem', border: '1px solid #ddd' }}>
                            <label>
                                Q{qIndex + 1}:{' '}
                                <input
                                    type="text"
                                    value={q.text}
                                    onChange={e => updateQuestionText(cIndex, qIndex, e.target.value)}
                                    placeholder="Enter question text"
                                    style={{ width: '60%' }}
                                />
                            </label>
                            <button
                                onClick={() => removeQuestion(cIndex, qIndex)}
                                style={{ marginLeft: '0.5rem', color: 'red' }}
                                title="Remove question"
                            >✖</button>
                            <div style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
                                <h6>Answers</h6>
                                {(q.answers || []).map((a, aIndex) => (
                                    <div key={aIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.3rem' }}>
                                        <input
                                            type="text"
                                            value={a.text}
                                            onChange={e => updateAnswerText(cIndex, qIndex, aIndex, e.target.value)}
                                            placeholder="Answer text"
                                            style={{ flexGrow: 1 }}
                                        />
                                        <label style={{ marginLeft: '0.5rem' }}>
                                            Correct{' '}
                                            <input
                                                type="checkbox"
                                                checked={a.is_correct}
                                                onChange={() => toggleCorrect(cIndex, qIndex, aIndex)}
                                            />
                                        </label>
                                        <button
                                            onClick={() => removeAnswer(cIndex, qIndex, aIndex)}
                                            style={{ marginLeft: '0.5rem', color: 'red' }}
                                            title="Remove answer"
                                        >✖</button>
                                    </div>
                                ))}
                                <button onClick={() => addAnswer(cIndex, qIndex)} style={{ marginTop: '0.5rem' }}>
                                    + Add Answer
                                </button>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => addQuestion(cIndex)} style={{ marginTop: '0.5rem' }}>
                        + Add Question
                    </button>
                </div>
            </div>
        ))}
        <button onClick={addCategory} style={{ marginTop: '0.5rem' }}>+ Add Category</button>
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
