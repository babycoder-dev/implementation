import { z } from 'zod'

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  deadline: z.string().datetime().optional(),
  assignedUserIds: z.array(z.string()).default([]),
  files: z.array(z.object({
    title: z.string().min(1),
    fileType: z.enum(['pdf', 'docx', 'xlsx', 'pptx', 'video']),
    fileUrl: z.string().url(),
    fileSize: z.number().min(0),
  })).default([]),
  questions: z.array(z.object({
    question: z.string().min(1),
    options: z.array(z.string()).min(2).max(6),
    correctAnswer: z.number().min(0),
  })).optional(),
  passingScore: z.number().min(0).max(100).default(100),
  strictMode: z.boolean().default(true),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
