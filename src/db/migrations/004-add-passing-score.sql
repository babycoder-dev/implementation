-- Migration: Add passing score feature
-- Date: 2024-02-08

-- Add passing_score column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 60;

-- Create quiz_submissions table
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id),
  user_id UUID NOT NULL REFERENCES users(id),
  score DECIMAL(5,2) NOT NULL,
  passed BOOLEAN NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_task_user
  ON quiz_submissions(task_id, user_id);
