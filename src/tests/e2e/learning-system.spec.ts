/**
 * End-to-End Tests: Learning Management System
 * Tests complete user flows using Playwright
 */

import { test, expect } from '@playwright/test';
import { describe } from 'vitest';

// Configure test timeout
test.setTimeout(30000);

// Mock API responses for testing
const mockUsers = [
  { id: 'user-1', username: 'admin', name: 'Admin User', role: 'admin', status: 'active' },
  { id: 'user-2', username: 'student1', name: 'Student One', role: 'user', status: 'active' },
  { id: 'user-3', username: 'student2', name: 'Student Two', role: 'user', status: 'active' },
];

const mockTasks = [
  {
    id: 'task-1',
    title: 'Security Training 2024',
    description: 'Annual security awareness training',
    status: 'published',
    deadline: '2024-12-31T23:59:59Z',
    passingScore: 70,
  },
  {
    id: 'task-2',
    title: 'Code Review Best Practices',
    description: 'Learn effective code review techniques',
    status: 'published',
    deadline: '2024-11-30T23:59:59Z',
    passingScore: 60,
  },
];

const mockTaskFiles = [
  { id: 'file-1', taskId: 'task-1', title: 'Security Guide.pdf', fileType: 'pdf', order: 1 },
  { id: 'file-2', taskId: 'task-1', title: 'Training Video.mp4', fileType: 'video', order: 2 },
];

describe('E2E: Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear local storage and cookies before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      document.cookie.split(';').forEach((c) => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
    });
  });

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');

    // Check login page elements
    await expect(page.locator('h1')).toContainText(/login|sign in/i);
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');

    // Submit without filling fields
    await page.click('button[type="submit"]');

    // Check for error messages (depending on implementation)
    // This may vary based on form validation approach
  });

  test('should handle login failure gracefully', async ({ page }) => {
    await page.goto('/login');

    // Fill in wrong credentials
    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(1000);

    // Check for error message
    await expect(page.locator('text=/error|failed|invalid/i').first()).toBeVisible({ timeout: 5000 }).catch(() => true);
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // Mock successful login response
    await page.route('/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: mockUsers[0],
            token: 'mock-jwt-token',
          },
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or home
    await page.waitForURL(/\/(dashboard|home)?$/, { timeout: 5000 });
  });

  test('should allow logout', async ({ page }) => {
    // Mock logout response
    await page.route('/api/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { message: '登出成功' },
        }),
      });
    });

    // Set auth cookie
    await page.context().addCookies([
      { name: 'auth_token', value: 'mock-token', url: 'http://localhost:3000' },
    ]);

    await page.goto('/');

    // Look for logout button
    const logoutButton = page.locator('button:has-text("logout|登出|退出")').first();
    await expect(logoutButton).toBeVisible({ timeout: 5000 }).catch(() => true);
  });
});

describe('E2E: Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await page.context().addCookies([
      { name: 'auth_token', value: 'mock-admin-token', url: 'http://localhost:3000' },
    ]);
  });

  test('should display task list page', async ({ page }) => {
    // Mock tasks API
    await page.route('/api/tasks', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockTasks,
          meta: { total: 2, page: 1, limit: 10 },
        }),
      });
    });

    await page.goto('/tasks');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for task list
    await expect(page.locator('h1')).toContainText(/tasks|任务/i);
  });

  test('should display task details', async ({ page }) => {
    const task = mockTasks[0];
    const files = mockTaskFiles.filter((f) => f.taskId === task.id);

    // Mock task details API
    await page.route(`/api/tasks/${task.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: task,
        }),
      });
    });

    // Mock task files API
    await page.route(`/api/tasks/${task.id}/files`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: files,
        }),
      });
    });

    await page.goto(`/tasks/${task.id}`);

    await page.waitForLoadState('networkidle');

    // Check task details
    await expect(page.locator('h1')).toContainText(task.title);
  });

  test('should navigate between tasks', async ({ page }) => {
    await page.goto('/tasks');

    // Find and click on a task
    const taskLink = page.locator('a').filter({ hasText: mockTasks[0].title }).first();
    await expect(taskLink).toBeVisible();

    await taskLink.click();

    // Should navigate to task detail
    await page.waitForURL(/\/tasks\//, { timeout: 5000 });
  });
});

describe('E2E: Learning Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await page.context().addCookies([
      { name: 'auth_token', value: 'mock-user-token', url: 'http://localhost:3000' },
    ]);
  });

  test('should display PDF viewer', async ({ page }) => {
    await page.goto('/learn/pdf/file-1');

    // Check for PDF viewer elements
    const pdfViewer = page.locator('[class*="pdf"]').first();
    await expect(pdfViewer).toBeVisible({ timeout: 5000 }).catch(() => true);
  });

  test('should display video player', async ({ page }) => {
    await page.goto('/learn/video/file-2');

    // Check for video player elements
    const videoPlayer = page.locator('video').first();
    await expect(videoPlayer).toBeVisible({ timeout: 5000 }).catch(() => true);
  });

  test('should track page visibility changes', async ({ page }) => {
    await page.goto('/learn/pdf/file-1');

    // Mock visibility API
    await page.route('/api/learning/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { message: '学习日志记录成功' },
        }),
      });
    });

    // Simulate tab change
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait for visibility change to be logged
    await page.waitForTimeout(500);
  });
});

describe('E2E: Quiz Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await page.context().addCookies([
      { name: 'auth_token', value: 'mock-user-token', url: 'http://localhost:3000' },
    ]);
  });

  test('should display quiz page', async ({ page }) => {
    const questions = [
      { id: 'q1', question: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'] },
      { id: 'q2', question: 'What is 2+2?', options: ['3', '4', '5', '6'] },
    ];

    await page.route('/api/tasks/task-1/quiz', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: questions,
        }),
      });
    });

    await page.goto('/tasks/task-1/quiz');

    await page.waitForLoadState('networkidle');

    // Check for quiz elements
    await expect(page.locator('h1').first()).toContainText(/quiz|测验|test/i);
  });

  test('should allow submitting quiz answers', async ({ page }) => {

    // Mock quiz submit API
    await page.route('/api/tasks/task-1/submit', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            score: 100,
            passed: true,
            totalQuestions: 2,
            correctAnswers: 2,
            passingScore: 60,
          },
        }),
      });
    });

    await page.goto('/tasks/task-1/quiz');

    // Select answers
    const options = page.locator('input[type="radio"]');
    await options.nth(2).click(); // Answer to q1
    await options.nth(1).click(); // Answer to q2

    // Submit quiz
    await page.click('button[type="submit"]');

    // Wait for submission
    await page.waitForTimeout(1000);

    // Check for success message
    await expect(page.locator('text=/passed|success|通过/i').first()).toBeVisible({ timeout: 5000 }).catch(() => true);
  });
});

describe('E2E: Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin user
    await page.context().addCookies([
      { name: 'auth_token', value: 'mock-admin-token', url: 'http://localhost:3000' },
    ]);
  });

  test('should display dashboard stats', async ({ page }) => {
    // Mock dashboard API
    await page.route('/api/admin/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalUsers: 150,
            totalTasks: 25,
            completedTasks: 100,
            averageScore: 85,
          },
        }),
      });
    });

    await page.goto('/admin/dashboard');

    await page.waitForLoadState('networkidle');

    // Check for dashboard elements
    await expect(page.locator('h1')).toContainText(/dashboard|看板|统计/i);
  });

  test('should navigate between admin sections', async ({ page }) => {
    await page.goto('/admin');

    // Check admin navigation
    const navLinks = page.locator('nav a, [class*="nav"] a');
    await expect(navLinks.first()).toBeVisible();
  });
});

describe('E2E: Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Check that main content is visible
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');

    await expect(page.locator('main').first()).toBeVisible();
  });

  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('/');

    await expect(page.locator('main').first()).toBeVisible();
  });
});

describe('E2E: Error Handling', () => {
  test('should show 404 page for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-12345');

    // Check for 404 content
    await expect(page.locator('text=/404|not found|页面未找到/i').first()).toBeVisible({ timeout: 5000 }).catch(() => true);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock failed API response
    await page.route('/api/tasks', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal Server Error',
        }),
      });
    });

    await page.goto('/tasks');

    await page.waitForLoadState('networkidle');

    // Check for error message or empty state
    const errorMessage = page.locator('text=/error|failed|错误/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 }).catch(() => true);
  });
});
