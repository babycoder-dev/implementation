import { z } from 'zod'

export const logLearningActionSchema = z.object({
  fileId: z.string().uuid(),
  actionType: z.enum(['open', 'next_page', 'finish']),
  pageNum: z.number().int().min(1),
})

export const logVideoActionSchema = z.object({
  fileId: z.string().uuid(),
  action: z.enum(['play', 'pause', 'seek', 'finish']),
  currentTime: z.number().int().min(0),
})

export const updateVideoProgressSchema = z.object({
  fileId: z.string().uuid(),
  currentTime: z.number().int().min(0),
  duration: z.number().int().min(0),
})

export type LogLearningActionInput = z.infer<typeof logLearningActionSchema>
export type LogVideoActionInput = z.infer<typeof logVideoActionSchema>
export type UpdateVideoProgressInput = z.infer<typeof updateVideoProgressSchema>
