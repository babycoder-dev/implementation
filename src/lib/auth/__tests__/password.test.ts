import { hashPassword, verifyPassword } from '../password'

describe('Password', () => {
  const plainPassword = 'Test123456'

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await hashPassword(plainPassword)
      expect(hash).not.toBe(plainPassword)
      expect(hash).toHaveLength(60) // bcrypt hash length
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const hash = await hashPassword(plainPassword)
      const isValid = await verifyPassword(plainPassword, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const hash = await hashPassword(plainPassword)
      const isValid = await verifyPassword('WrongPassword', hash)
      expect(isValid).toBe(false)
    })
  })
})
