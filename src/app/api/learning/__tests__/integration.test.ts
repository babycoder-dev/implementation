/**
 * SSR03 Learning Tracking Integration Tests
 *
 * Integration tests using existing PostgreSQL database
 * Tests the learning tracking module data operations
 *
 * Prerequisites:
 * - TEST_DATABASE_URL environment variable must be set
 * - Database must be initialized with schema.sql
 *
 * Run with: TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/learning_system_test" pnpm vitest run
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe('SSR03 Learning Tracking Integration Tests', () => {
  let sql: postgres.Sql<Record<string, unknown>>;

  // Test data IDs
  let adminUser: { id: string; username: string; name: string };
  let regularUser: { id: string; username: string; name: string };
  let testDepartment: { id: string; name: string };
  let testTask: { id: string; title: string; status: string };
  let testPdfFile: { id: string; title: string; file_type: string };
  let testVideoFile: { id: string; title: string; file_type: string };
  let testAssignment: { id: string };

  beforeAll(async () => {
    if (!TEST_DATABASE_URL) {
      console.log('TEST_DATABASE_URL not set, skipping integration tests');
      return;
    }

    sql = postgres(TEST_DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    console.log('Connected to test database for SSR03');
  });

  // Skip all tests if no database
  const itIfDb = TEST_DATABASE_URL ? it : it.skip;

  afterAll(async () => {
    if (sql) {
      await sql.end();
    }
  });

  beforeEach(async () => {
    if (!sql) return;

    // Clean up before each test
    await sql`DELETE FROM file_progress`;
    await sql`DELETE FROM quiz_submissions`;
    await sql`DELETE FROM quiz_questions`;
    await sql`DELETE FROM task_assignments`;
    await sql`DELETE FROM task_files`;
    await sql`DELETE FROM tasks`;
    await sql`DELETE FROM users WHERE username NOT LIKE 'admin%'`;
    await sql`DELETE FROM departments`;

    // Create test data
    adminUser = await createUser('admin', 'Admin User', 'admin');
    regularUser = await createUser('user1', 'Regular User', 'user');
    testDepartment = await createDepartment('Tech Dept');

    await sql`
      UPDATE users SET department_id = ${testDepartment.id}
      WHERE id = ${regularUser.id}
    `;

    testTask = await createTask('Learning Task', 'published', adminUser.id);
    testPdfFile = await createTaskFile(testTask.id, 'Test PDF', 'pdf', 10);
    testVideoFile = await createTaskFile(testTask.id, 'Test Video', 'video', 0);

    await sql`
      INSERT INTO task_assignments (task_id, user_id, assignment_type, assigned_by)
      VALUES (${testTask.id}, ${regularUser.id}, 'user', ${adminUser.id})
    `;

    const assignments = await sql`
      SELECT id FROM task_assignments WHERE task_id = ${testTask.id}
    `;
    testAssignment = assignments[0];
  });

  async function createUser(username: string, name: string, role: string) {
    const uniqueUsername = `${username}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await sql`
      INSERT INTO users (username, password_hash, name, role, status)
      VALUES (${uniqueUsername}, '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', ${name}, ${role}, 'active')
      RETURNING id, username, name
    `;
    return result[0];
  }

  async function createDepartment(name: string) {
    const uniqueName = `${name}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await sql`
      INSERT INTO departments (name, description)
      VALUES (${uniqueName}, 'Test Department')
      RETURNING id, name
    `;
    return result[0];
  }

  async function createTask(title: string, status: string, createdBy: string) {
    const uniqueTitle = `${title}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await sql`
      INSERT INTO tasks (title, status, created_by, passing_score)
      VALUES (${uniqueTitle}, ${status}, ${createdBy}, 60)
      RETURNING id, title, status
    `;
    return result[0];
  }

  async function createTaskFile(taskId: string, title: string, fileType: string, totalPages: number) {
    const uniqueTitle = `${title}_${Date.now()}`;
    const result = await sql`
      INSERT INTO task_files (task_id, title, file_url, file_type, file_size, "order", total_pages)
      VALUES (${taskId}, ${uniqueTitle}, ${`/uploads/${uniqueTitle}`}, ${fileType}, ${1024}, ${1}, ${totalPages})
      RETURNING id, title, file_type
    `;
    return result[0];
  }

  describe('File Progress Operations', () => {
    itIfDb('should create new file progress record', async () => {
      const result = await sql`
        INSERT INTO file_progress (user_id, file_id, task_id, current_page, total_pages, progress, effective_time)
        VALUES (${regularUser.id}, ${testPdfFile.id}, ${testTask.id}, 1, 10, 10, 60)
        RETURNING id, user_id, file_id, current_page, progress
      `;

      expect(result).toBeDefined();
      expect(result[0].user_id).toBe(regularUser.id);
      expect(result[0].file_id).toBe(testPdfFile.id);
      expect(result[0].current_page).toBe(1);
      expect(result[0].progress).toBe(10);
    });

    itIfDb('should update existing file progress on conflict', async () => {
      await sql`
        INSERT INTO file_progress (user_id, file_id, task_id, current_page, total_pages, progress, effective_time)
        VALUES (${regularUser.id}, ${testPdfFile.id}, ${testTask.id}, 1, 10, 10, 60)
      `;

      const result = await sql`
        INSERT INTO file_progress (user_id, file_id, task_id, current_page, total_pages, progress, effective_time)
        VALUES (${regularUser.id}, ${testPdfFile.id}, ${testTask.id}, 5, 10, 50, 300)
        ON CONFLICT (user_id, file_id)
        DO UPDATE SET
          current_page = EXCLUDED.current_page,
          progress = EXCLUDED.progress,
          effective_time = file_progress.effective_time + EXCLUDED.effective_time,
          last_accessed = NOW()
        RETURNING id, current_page, progress, effective_time
      `;

      expect(result[0].current_page).toBe(5);
      expect(result[0].progress).toBe(50);
      expect(result[0].effective_time).toBe(360);
    });

    itIfDb('should mark file as completed when progress reaches 100%', async () => {
      const result = await sql`
        INSERT INTO file_progress (user_id, file_id, task_id, current_page, total_pages, progress, effective_time, completed_at)
        VALUES (${regularUser.id}, ${testPdfFile.id}, ${testTask.id}, 10, 10, 100, 600, NOW())
        RETURNING id, progress, completed_at
      `;

      expect(result[0].progress).toBe(100);
      expect(result[0].completed_at).toBeDefined();
    });

    itIfDb('should calculate video progress correctly', async () => {
      const result = await sql`
        INSERT INTO file_progress (user_id, file_id, task_id, current_time, duration, progress, effective_time)
        VALUES (${regularUser.id}, ${testVideoFile.id}, ${testTask.id}, 95, 100, 95, 95)
        RETURNING id, current_time, duration, progress
      `;

      expect(result[0].current_time).toBe(95);
      expect(result[0].duration).toBe(100);
      expect(result[0].progress).toBe(95);
    });

    itIfDb('should accumulate effective time across sessions', async () => {
      await sql`
        INSERT INTO file_progress (user_id, file_id, task_id, effective_time)
        VALUES (${regularUser.id}, ${testPdfFile.id}, ${testTask.id}, 100)
      `;

      const result = await sql`
        INSERT INTO file_progress (user_id, file_id, task_id, effective_time)
        VALUES (${regularUser.id}, ${testPdfFile.id}, ${testTask.id}, 200)
        ON CONFLICT (user_id, file_id)
        DO UPDATE SET effective_time = file_progress.effective_time + EXCLUDED.effective_time
        RETURNING effective_time
      `;

      expect(result[0].effective_time).toBe(300);
    });
  });

  describe('Task Completion Operations', () => {
    itIfDb('should check if user is assigned to task', async () => {
      const result = await sql`
        SELECT id, task_id, user_id, is_completed
        FROM task_assignments
        WHERE task_id = ${testTask.id} AND user_id = ${regularUser.id}
      `;

      expect(result.length).toBe(1);
      expect(result[0].is_completed).toBe(false);
    });

    itIfDb('should verify all files are completed before task completion', async () => {
      // Only complete PDF file, not video
      await sql`
        INSERT INTO file_progress (user_id, file_id, task_id, current_page, total_pages, progress, completed_at)
        VALUES (${regularUser.id}, ${testPdfFile.id}, ${testTask.id}, 10, 10, 100.00, NOW())
      `;

      const allFiles = await sql`SELECT id FROM task_files WHERE task_id = ${testTask.id}`;
      const completedFiles = await sql`
        SELECT file_id FROM file_progress
        WHERE user_id = ${regularUser.id}
        AND file_id IN ${sql(allFiles.map(f => f.id))}
        AND completed_at IS NOT NULL
      `;

      const incompleteFiles = allFiles.filter(f => !completedFiles.some(c => c.file_id === f.id));

      expect(incompleteFiles.length).toBeGreaterThanOrEqual(1);
    });

    itIfDb('should complete task when all files are done', async () => {
      await sql`
        INSERT INTO file_progress (user_id, file_id, task_id, current_page, total_pages, progress, completed_at)
        VALUES
          (${regularUser.id}, ${testPdfFile.id}, ${testTask.id}, 10, 10, 100, NOW()),
          (${regularUser.id}, ${testVideoFile.id}, ${testTask.id}, 95, 100, 95, NOW())
      `;

      const result = await sql`
        UPDATE task_assignments
        SET is_completed = true, submitted_at = NOW()
        WHERE task_id = ${testTask.id} AND user_id = ${regularUser.id}
        RETURNING id, is_completed, submitted_at
      `;

      expect(result[0].is_completed).toBe(true);
      expect(result[0].submitted_at).toBeDefined();
    });
  });

  describe('Quiz Submission Operations', () => {
    itIfDb('should create quiz submission', async () => {
      await sql`
        INSERT INTO quiz_questions (task_id, question, options, correct_answer, "order")
        VALUES (${testTask.id}, 'Test Question?', ${JSON.stringify(['A', 'B', 'C', 'D'])}, 0, 1)
      `;

      const result = await sql`
        INSERT INTO quiz_submissions (task_id, user_id, answers, score, passed)
        VALUES (${testTask.id}, ${regularUser.id}, ${JSON.stringify([0])}, 100, true)
        RETURNING id, passed
      `;

      expect(result[0].passed).toBe(true);
    });

    itIfDb('should fail quiz with wrong answer', async () => {
      await sql`
        INSERT INTO quiz_questions (task_id, question, options, correct_answer, "order")
        VALUES (${testTask.id}, 'Test Question?', ${JSON.stringify(['A', 'B', 'C', 'D'])}, 0, 1)
      `;

      const result = await sql`
        INSERT INTO quiz_submissions (task_id, user_id, answers, score, passed)
        VALUES (${testTask.id}, ${regularUser.id}, ${JSON.stringify([1])}, 0, false)
        RETURNING id, passed
      `;

      expect(result[0].passed).toBe(false);
    });
  });

  describe('Learning Progress Queries', () => {
    itIfDb('should get empty progress for new user', async () => {
      const result = await sql`
        SELECT * FROM file_progress
        WHERE user_id = ${regularUser.id} AND file_id = ${testPdfFile.id}
      `;

      expect(result.length).toBe(0);
    });

    itIfDb('should get user progress for specific file', async () => {
      await sql`
        INSERT INTO file_progress (user_id, file_id, task_id, current_page, total_pages, progress, effective_time, started_at, last_accessed)
        VALUES (${regularUser.id}, ${testPdfFile.id}, ${testTask.id}, 5, 10, 50.00, 300, NOW(), NOW())
      `;

      const result = await sql`
        SELECT * FROM file_progress
        WHERE user_id = ${regularUser.id} AND file_id = ${testPdfFile.id}
      `;

      expect(result.length).toBe(1);
      expect(result[0].current_page).toBe(5);
      expect(Number(result[0].progress)).toBe(50);
      expect(result[0].effective_time).toBe(300);
    });

    itIfDb('should get all files progress for a task', async () => {
      await sql`
        INSERT INTO file_progress (user_id, file_id, task_id, current_page, total_pages, progress)
        VALUES
          (${regularUser.id}, ${testPdfFile.id}, ${testTask.id}, 10, 10, 100.00),
          (${regularUser.id}, ${testVideoFile.id}, ${testTask.id}, 50, 100, 50.00)
      `;

      const result = await sql`
        SELECT fp.*, tf.file_type
        FROM file_progress fp
        JOIN task_files tf ON fp.file_id = tf.id
        WHERE fp.user_id = ${regularUser.id} AND tf.task_id = ${testTask.id}
      `;

      expect(result.length).toBe(2);
      expect(result.some(r => r.file_type === 'pdf' && Number(r.progress) === 100)).toBe(true);
      expect(result.some(r => r.file_type === 'video' && Number(r.progress) === 50)).toBe(true);
    });
  });
});
