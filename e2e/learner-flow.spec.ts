import { test, expect } from '@playwright/test'

test.describe('Learner Flow', () => {
  test('should redirect from dashboard when not logged in', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*login/)
  })

  test('should redirect from progress when not logged in', async ({ page }) => {
    await page.goto('/progress')
    await expect(page).toHaveURL(/.*login/)
  })

  test('should show LMS branding on login page', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('form', { timeout: 10000 })
    // Check the h2 element with LMS branding
    await expect(page.locator('div.text-2xl:has-text("企业学习管理系统")').first()).toBeVisible()
  })
})

test.describe('Task Detail Page', () => {
  test('should redirect from task detail when not logged in', async ({ page }) => {
    await page.goto('/tasks/test-uuid')
    await expect(page).toHaveURL(/.*login/)
  })

  test('should show login for non-existent task when not authenticated', async ({ page }) => {
    await page.goto('/tasks/00000000-0000-0000-0000-000000000000')
    await expect(page).toHaveURL(/.*login/)
  })
})

test.describe('Page Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('form', { timeout: 10000 })
  })

  test('should have proper form structure on login page', async ({ page }) => {
    // Check form structure
    const form = page.locator('form')
    await expect(form).toBeVisible()

    // Check username field
    const usernameInput = page.locator('input#username')
    await expect(usernameInput).toBeVisible()
    await expect(usernameInput).toHaveAttribute('type', 'text')

    // Check password field
    const passwordInput = page.locator('input#password')
    await expect(passwordInput).toBeVisible()
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Check submit button
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toContainText('登录')
  })

  test('should have Chinese labels on login form', async ({ page }) => {
    await expect(page.locator('label:has-text("用户名")')).toBeVisible()
    await expect(page.locator('label:has-text("密码")')).toBeVisible()
  })
})
