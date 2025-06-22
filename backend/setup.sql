-- backend/setup.sql

DROP TABLE IF EXISTS quizzes;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS answers;

CREATE TABLE quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  category TEXT,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

CREATE TABLE answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Sample quiz
INSERT INTO quizzes (name) VALUES ('General Knowledge');

-- Sample questions and answers
INSERT INTO questions (quiz_id, text, category) VALUES (1, 'What is the capital of France?', 'Geography');
INSERT INTO answers (question_id, text, is_correct) VALUES (1, 'Paris', 1);
INSERT INTO answers (question_id, text, is_correct) VALUES (1, 'Berlin', 0);
INSERT INTO answers (question_id, text, is_correct) VALUES (1, 'Madrid', 0);
INSERT INTO answers (question_id, text, is_correct) VALUES (1, 'Rome', 0);
