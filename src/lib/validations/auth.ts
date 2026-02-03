import { z } from 'zod'

const COMMON_WEAK_PASSWORDS = [
  'password',
  '123456',
  '12345678',
  'qwerty',
  'admin',
  'welcome',
  'monkey',
  'dragon',
  'letmein',
  'password1',
  'abc123',
  '123123',
  '1234567890',
  '111111',
  '123abc',
  'test123',
  'admin123',
  'pass1234',
  'Password1',
  'qwerty123',
  'welcome123',
  'admin12345',
]

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少需要 3 个字符')
    .max(20, '用户名最多 20 个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '只能包含字母、数字和下划线'),
  password: z
    .string()
    .min(8, '密码至少需要 8 个字符')
    .regex(
      /(?=.*[A-Z])/,
      '密码必须包含至少一个大写字母'
    )
    .regex(/(?=.*\d)/, '密码必须包含至少一个数字')
    .refine(
      (password) => {
        const lowerPassword = password.toLowerCase()
        return !COMMON_WEAK_PASSWORDS.some(
          (weak) => weak.toLowerCase() === lowerPassword
        )
      },
      '密码过于简单，请使用更复杂的密码'
    ),
  name: z.string().min(1, '姓名不能为空').max(50, '姓名最多 50 个字符'),
})

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
