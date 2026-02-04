// Simple test to verify the admin tasks page exists and can be imported
// This ensures the 404 error is fixed

describe('AdminTasksPage', () => {
  it('should export a default page component', async () => {
    // Dynamic import to verify the page module exists
    const pageModule = await import('../page')
    expect(pageModule.default).toBeDefined()
    expect(typeof pageModule.default).toBe('function')
  })
})
