-- Migration: Add deleted status and deadline tracking
-- Date: 2026-02-13
-- Purpose: Ensure proper indexing for tasks status and file_progress task_id,
--          add deadline_passed status update functionality

-- ============================================
-- 1. Ensure tasks status index exists (idempotent)
-- ============================================
-- This ensures queries filtering by status are performant
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ============================================
-- 2. Ensure file_progress task_id index exists (idempotent)
-- ============================================
-- This ensures joins between file_progress and tasks are performant
CREATE INDEX IF NOT EXISTS idx_file_progress_task_id ON file_progress(task_id);

-- ============================================
-- 3. Add deadline index if not exists
-- ============================================
-- For efficient querying of overdue tasks
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);

-- ============================================
-- 4. Create function to update deadline_passed status
-- ============================================
-- This function updates tasks with passed deadlines to 'deadline_passed' status
-- Only updates tasks that are still in 'draft' or 'published' status
CREATE OR REPLACE FUNCTION update_deadline_passed_tasks()
RETURNS void AS $$
BEGIN
  UPDATE tasks
  SET status = 'deadline_passed'
  WHERE deadline < NOW()
    AND status IN ('draft', 'published');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Optional: Create scheduled job for deadline updates
-- ============================================
-- Uncomment if you want automatic deadline tracking:
-- CREATE OR REPLACE FUNCTION run_deadline_updates()
-- RETURNS void AS $$
-- BEGIN
--   PERFORM update_deadline_passed_tasks();
-- END;
-- $$ LANGUAGE plpgsql;
--
-- -- This would require a cron job or pgAgent to run periodically
-- -- Example: SELECT run_deadline_updates();
