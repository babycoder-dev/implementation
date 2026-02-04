'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface Question {
  id: string
  question: string
  options: string[]
}

interface QuizClientProps {
  taskId: string
  questions: Question[]
}

export default function QuizClient({ taskId, questions }: QuizClientProps) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ score: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: parseInt(value, 10)
    }))
  }

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      setError('请回答所有题目')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const answersArray = questions.map(q => ({
        questionId: q.id,
        answer: answers[q.id]
      }))

      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, answers: answersArray })
      })

      const data = await res.json()

      if (data.success) {
        setResult(data.data)
        setSubmitted(true)
      } else {
        setError(data.error || '提交失败')
      }
    } catch {
      setError('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReturn = () => {
    router.push(`/tasks/${taskId}`)
  }

  if (submitted && result) {
    const passed = result.score >= Math.ceil(result.total * 0.6)
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>测验结果</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-5xl font-bold">
              {result.score} / {result.total}
            </div>
            <p className={`text-lg ${passed ? 'text-green-600' : 'text-red-600'}`}>
              {passed ? '及格' : '不及格，请重新学习'}
            </p>
            <Button onClick={handleReturn} className="mt-4">
              返回任务
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">测验</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {questions.map((q, idx) => (
        <Card key={q.id}>
          <CardHeader>
            <CardTitle>{idx + 1}. {q.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[q.id]?.toString() || ''}
              onValueChange={(val) => handleAnswerChange(q.id, val)}
              disabled={submitted}
            >
              {q.options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center space-x-2">
                  <RadioGroupItem value={optIdx.toString()} id={`q${q.id}-opt${optIdx}`} />
                  <Label htmlFor={`q${q.id}-opt${optIdx}`}>{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      ))}

      <Button
        onClick={handleSubmit}
        disabled={Object.keys(answers).length < questions.length || submitting}
        className="w-full"
        size="lg"
      >
        {submitting ? '提交中...' : '提交答案'}
      </Button>
    </div>
  )
}
