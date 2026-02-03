import { logLearningActionSchema, logVideoActionSchema, updateVideoProgressSchema } from '@/lib/validations/learning'

export async function logLearningAction(data: Parameters<typeof logLearningActionSchema.parse>[0]) {
  const validated = logLearningActionSchema.parse(data)

  await fetch('/api/learning/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validated),
  })
}

export async function logVideoAction(data: Parameters<typeof logVideoActionSchema.parse>[0]) {
  const validated = logVideoActionSchema.parse(data)

  await fetch('/api/learning/video/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validated),
  })
}

export async function updateVideoProgress(data: Parameters<typeof updateVideoProgressSchema.parse>[0]) {
  const validated = updateVideoProgressSchema.parse(data)

  await fetch('/api/learning/video/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validated),
  })
}
