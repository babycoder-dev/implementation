import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    // Wait for form to be visible (hydration)
    await page.waitForSelector('form', { timeout: 10000 })
  })

  test('should display login form', async ({ page }) => {
    // Check login form elements are visible
    await expect(page.locator('form')).toBeVisible()
    await expect(page.locator('input#username')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    // Check Chinese text content
    await expect(page.locator('text=企业学习管理系统').first()).toBeVisible()
    await expect(page.locator('text=请登录您的账号')).toBeVisible()
  })

  test('should redirect to login when accessing protected page', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*login/)
  })

  test('should handle form submission', async ({ page }) => {
    await page.fill('input#username', 'invalid_user')
    await page.fill('input#password', 'wrong_password')
    // Click and wait for navigation or response
    await Promise.all([
      page.waitForURL(/.*(login|dashboard)/),
      page.click('button[type="submit"]'),
    ])
    // Should stay on login page due to invalid credentials
    await expect(page.locator('input#username')).toBeVisible()
  })

  test('should have working form inputs', async ({ page }) => {
    // Test that inputs accept text
    await page.fill('input#username', 'testuser')
    await expect(page.locator('input#username')).toHaveValue('testuser')

    await page.fill('input#password', 'testpass')
    await expect(page.locator('input#password')).toHaveValue('testpass')
  })
})
