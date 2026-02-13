/**
 * Integration Test Helpers
 *
 * Database operations for integration tests
 */

import { sql as sqlTemplate } from 'postgres';

let sql: any = null;

/**
 * Initialize with database URL
 */
export function initTestDb(databaseUrl: string): void {
  sql = sqlTemplate(databaseUrl);
}

/**
 * Create a test user
 */
export async function createTestUser(overrides: {
  username?: string;
  name?: string;
  role?: string;
  department_id?: string;
  status?: string;
} = {}): Promise<{ id: string; username: string; name: string }> {
  const result = await sql`
    INSERT INTO users (username, password_hash, name, role, department_id, status)
    VALUES (
      ${overrides.username || `user_${Date.now()}`},
      ${'$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'},
      ${overrides.name || 'Test User'},
      ${overrides.role || 'user'},
      ${overrides.department_id || null},
      ${overrides.status || 'active'}
    )
    RETURNING id, username, name
  `;
  return result[0];
}

/**
 * Create a test department
 */
export async function createTestDepartment(overrides: {
  name?: string;
  description?: string;
} = {}): Promise<{ id: string; name: string }> {
  const result = await sql`
    INSERT INTO departments (name, description)
    VALUES (
      ${overrides.name || `Dept_${Date.now()}`},
      ${overrides.description || 'Test Department'}
    )
    RETURNING id, name
  `;
  return result[0];
}

/**
 * Create a test task
 */
export async function createTestTask(overrides: {
  title?: string;
  description?: string;
  status?: string;
  created_by?: string;
  deadline?: string;
  passing_score?: number;
  strict_mode?: boolean;
  enable_quiz?: boolean;
} = {}): Promise<{ id: string; title: string; status: string }> {
  const result = await sql`
    INSERT INTO tasks (
      title,
      description,
      status,
      created_by,
      deadline,
      passing_score,
      strict_mode,
      enable_quiz
    )
    VALUES (
      ${overrides.title || `Task_${Date.now()}`},
      ${overrides.description || null},
      ${overrides.status || 'draft'},
      ${overrides.created_by || null},
      ${overrides.deadline || null},
      ${overrides.passing_score || 60},
      ${overrides.strict_mode ?? true},
      ${overrides.enable_quiz ?? false}
    )
    RETURNING id, title, status
  `;
  return result[0];
}

/**
 * Create a test task file
 */
export async function createTestTaskFile(overrides: {
  task_id?: string;
  title?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  order?: number;
} = {}): Promise<{ id: string; title: string }> {
  const result = await sql`
    INSERT INTO task_files (
      task_id,
      title,
      file_url,
      file_type,
      file_size,
      "order"
    )
    VALUES (
      ${overrides.task_id || null},
      ${overrides.title || 'test.pdf'},
      ${overrides.file_url || '/uploads/test.pdf'},
      ${overrides.file_type || 'pdf'},
      ${overrides.file_size || 1024},
      ${overrides.order || 1}
    )
    RETURNING id, title
  `;
  return result[0];
}

/**
 * Create a task assignment
 */
export async function createTestAssignment(overrides: {
  task_id?: string;
  user_id?: string;
  assignment_type?: string;
  assigned_by?: string;
  is_completed?: boolean;
} = {}): Promise<{ id: string }> {
  const result = await sql`
    INSERT INTO task_assignments (
      task_id,
      user_id,
      assignment_type,
      assigned_by,
      is_completed
    )
    VALUES (
      ${overrides.task_id || null},
      ${overrides.user_id || null},
      ${overrides.assignment_type || 'user'},
      ${overrides.assigned_by || null},
      ${overrides.is_completed ?? false}
    )
    RETURNING id
  `;
  return result[0];
}

/**
 * Create a quiz question
 */
export async function createTestQuizQuestion(overrides: {
  task_id?: string;
  question?: string;
  options?: string[];
  correct_answer?: number;
  order?: number;
} = {}): Promise<{ id: string }> {
  const result = await sql`
    INSERT INTO quiz_questions (
      task_id,
      question,
      options,
      correct_answer,
      "order"
    )
    VALUES (
      ${overrides.task_id || null},
      ${overrides.question || 'Test question?'},
      ${JSON.stringify(overrides.options || ['A', 'B', 'C', 'D'])},
      ${overrides.correct_answer ?? 0},
      ${overrides.order || 1}
    )
    RETURNING id
  `;
  return result[0];
}

/**
 * Clean up test data
 */
export async function cleanupTestData(): Promise<void> {
  await sql`DELETE FROM quiz_questions`;
  await sql`DELETE FROM task_assignments`;
  await sql`DELETE FROM task_files`;
  await sql`DELETE FROM tasks`;
  await sql`DELETE FROM users`;
  await sql`DELETE FROM departments`;
}

/**
 * Close database connection
 */
export async function closeDb(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}
