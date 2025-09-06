
import { useState } from 'react';

const API_BASE = '/api';

function QuizBuilder({ onQuizCreated, onCancel, initialQuizData = null, editMode = false }) {
    // Mark/unmark an answer as correct
    const toggleCorrect = (catIndex, qIndex, aIndex) => {
        const newCategories = [...categories];
        const ans = newCategories[catIndex].questions[qIndex].answers[aIndex];
        ans.is_correct = !ans.is_correct;
        setCategories(newCategories);
    };


    const addQuestion = (catIndex) => {
        const newCategories = [...categories];
        newCategories[catIndex].questions.push({ text: '', image_url: '', answers: [{ text: '', is_correct: false }] });
        setCategories(newCategories);
    };
    // If editing, initialize state from initialQuizData
    const [quizName, setQuizName] = useState(initialQuizData?.quiz?.name || '');
    const [categories, setCategories] = useState(
        initialQuizData?.categories
            ? initialQuizData.categories.map(cat => ({
                name: cat.name,
                image_url: cat.image_url || '',
                questions: (cat.questions || []).map(q => ({
                    text: q.text || '',
                    image_url: q.image_url || '',
                    answers: (q.answers || []).map(a => ({ text: a.text, is_correct: !!a.is_correct, image_url: a.image_url || '' }))
                }))
            }))
            : []
    );


    const addCategory = () => {
        setCategories([...categories, { name: '', image_url: '', questions: [] }]);
    };

    // Ensure updateAnswerText is always defined and in scope
    const updateAnswerText = (catIndex, qIndex, aIndex, text) => {
        const newCategories = [...categories];
        newCategories[catIndex].questions[qIndex].answers[aIndex].text = text;
        setCategories(newCategories);
    };


    // ...existing code...
    const updateCategoryName = (index, name) => {
        const newCategories = [...categories];
        newCategories[index].name = name;
        setCategories(newCategories);
    };

    const updateCategoryImage = (index, url) => {
    const newCategories = [...categories];
    newCategories[index].image_url = url;
        setCategories(newCategories);
    };

    // Upload handler for category image
    const handleCategoryImageUpload = async (e, cIndex) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        try {
            const res = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.url) {
                updateCategoryImage(cIndex, data.url);
            } else {
                alert('Upload failed');
            }
        } catch (err) {
            alert('Upload failed');
        }
    };

    const updateQuestionText = (catIndex, qIndex, text) => {
        const newCategories = [...categories];
        newCategories[catIndex].questions[qIndex].text = text;
        setCategories(newCategories);
    };

    const updateQuestionImage = (catIndex, qIndex, url) => {
        const newCategories = [...categories];
        newCategories[catIndex].questions[qIndex].image_url = url;
        setCategories(newCategories);
    };

    // Upload handler for question image
    const handleQuestionImageUpload = async (e, cIndex, qIndex) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        try {
            const res = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.url) {
                updateQuestionImage(cIndex, qIndex, data.url);
            } else {
                alert('Upload failed');
            }
        } catch (err) {
            alert('Upload failed: ' + err.message);
        }
    };

    const updateQuestionCategory = (qIndex, catIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].categoryIndex = catIndex;
        setQuestions(newQuestions);
    };

    const addAnswer = (catIndex, qIndex) => {
        const newCategories = [...categories];
        newCategories[catIndex].questions[qIndex].answers.push({ text: '', is_correct: false, image_url: '' });
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
        if (categories.some(cat => cat.questions && cat.questions.some(q => !q.text.trim()))) {
            alert('All questions must have text');
            return;
        }
        try {
            let quizId;
            if (editMode && initialQuizData?.quiz?.id) {
                quizId = initialQuizData.quiz.id;
            } else {
                // Create new quiz
                const quizRes = await fetch(`${API_BASE}/quiz`, {
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
                    const catRes = await fetch(`${API_BASE}/categories/${initialQuizData.categories[cIndex].id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: cat.name, image_url: cat.image_url }),
                    });
                    if (!catRes.ok) throw new Error('Failed to update category');
                    categoryId = initialQuizData.categories[cIndex].id;
                } else {
                    // Create category
                    const catRes = await fetch(`${API_BASE}/categories`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ quiz_id: quizId, name: cat.name, image_url: cat.image_url }),
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
                        const questionRes = await fetch(`${API_BASE}/questions/${initialQuizData.categories[cIndex].questions[qIndex].id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: q.text, category_id: categoryId }),
                        });
                        if (!questionRes.ok) throw new Error('Failed to update question');
                        questionId = initialQuizData.categories[cIndex].questions[qIndex].id;
                    } else {
                        // Create new question
                        const questionRes = await fetch(`${API_BASE}/questions`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ quiz_id: quizId, text: q.text, category_id: categoryId, image_url: q.image_url }),
                        });
                        if (!questionRes.ok) throw new Error('Failed to create question');
                        const questionData = await questionRes.json();
                        questionId = questionData.id;
                    }
                    // Answers
                    for (let aIndex = 0; aIndex < q.answers.length; ++aIndex) {
                        const a = q.answers[aIndex];
                        let answerRes;
                        if (editMode && initialQuizData?.categories?.[cIndex]?.questions?.[qIndex]?.answers?.[aIndex]?.id) {
                            // Update answer
                            answerRes = await fetch(`${API_BASE}/answers/${initialQuizData.categories[cIndex].questions[qIndex].answers[aIndex].id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: a.text, is_correct: a.is_correct, image_url: a.image_url }),
                            });
                            if (!answerRes.ok) throw new Error('Failed to update answer');
                        } else {
                            // Create answer
                            answerRes = await fetch(`${API_BASE}/answers`, {
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
                    <input
                        type="text"
                        value={cat.image_url}
                        onChange={e => updateCategoryImage(cIndex, e.target.value)}
                        placeholder="Image URL (optional)"
                        style={{ marginLeft: '0.5rem', width: '30%' }}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        style={{ marginLeft: '0.5rem' }}
                        onChange={e => handleCategoryImageUpload(e, cIndex)}
                    />
                    {cat.image_url && (
                        <img src={cat.image_url} alt="Category" style={{ marginLeft: 8, width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #ccc' }} />
                    )}
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
                            <input
                                type="text"
                                value={q.image_url}
                                onChange={e => updateQuestionImage(cIndex, qIndex, e.target.value)}
                                placeholder="Question Image URL (optional)"
                                style={{ marginLeft: '0.5rem', width: '30%' }}
                            />
                            <input
                                type="file"
                                accept="image/*"
                                style={{ marginLeft: '0.5rem' }}
                                onChange={e => handleQuestionImageUpload(e, cIndex, qIndex)}
                            />
                            {q.image_url && (
                                <img src={q.image_url} alt="Question" style={{ marginLeft: 8, width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #ccc' }} />
                            )}
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
