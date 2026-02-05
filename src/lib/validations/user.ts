import { z } from 'zod'

export const createUserSchema = z.object({
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
    .regex(/(?=.*\d)/, '密码必须包含至少一个数字'),
  name: z.string().min(1, '姓名不能为空').max(50, '姓名最多 50 个字符'),
  role: z.enum(['user', 'admin']).default('user'),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少需要 3 个字符')
    .max(20, '用户名最多 20 个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '只能包含字母、数字和下划线')
    .optional(),
  password: z
    .string()
    .min(8, '密码至少需要 8 个字符')
    .regex(
      /(?=.*[A-Z])/,
      '密码必须包含至少一个大写字母'
    )
    .regex(/(?=.*\d)/, '密码必须包含至少一个数字')
    .optional(),
  name: z.string().min(1, '姓名不能为空').max(50, '姓名最多 50 个字符').optional(),
  role: z.enum(['user', 'admin']).optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
