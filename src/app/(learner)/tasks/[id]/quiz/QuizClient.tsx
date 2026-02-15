'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface Question {
  id: string
  question: string
  options: string[]
}

interface AnswerResult {
  questionId: string
  question: string
  options: string[]
  userAnswer: number
  correctAnswer: number
  isCorrect: boolean
}

interface QuizResult {
  score: number
  total: number
  passed: boolean
  answers: AnswerResult[]
}

interface QuizClientProps {
  taskId: string
  questions: Question[]
}

export default function QuizClient({ taskId, questions }: QuizClientProps) {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // FIX: Guard against division by zero when questions array is empty
  const progress = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0
  const isAnswered = (questionId: string) => questionId in answers

  // FIX: Early return for empty questions
  if (!questions || questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">暂无题目</p>
        </CardContent>
      </Card>
    )
  }

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
    // FIX: Use passed from backend instead of recalculating (backend handles strictMode)
    const passed = result.passed

    return (
      <div className="container mx-auto py-8 max-w-3xl space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>测验结果</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-5xl font-bold">
              {result.score} / {result.total}
            </div>
            <p className={`text-lg ${passed ? 'text-green-600' : 'text-red-600'}`}>
              {passed ? '及格' : '不及格，请重新学习'}
            </p>
            <Badge variant={passed ? 'default' : 'destructive'}>
              {Math.round((result.score / result.total) * 100)}%
            </Badge>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">答题详情</h2>
          {result.answers.map((answer, idx) => (
            <Card key={answer.questionId} className={answer.isCorrect ? 'border-green-200' : 'border-red-200'}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Badge variant={answer.isCorrect ? 'default' : 'destructive'}>
                    {idx + 1}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium mb-3">{answer.question}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">你的答案：</span>
                        <span className={answer.isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {String.fromCharCode(65 + answer.userAnswer)}. {answer.options[answer.userAnswer] || '无效答案'}
                        </span>
                      </div>
                      {!answer.isCorrect && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">正确答案：</span>
                          <span className="text-green-600 font-medium">
                            {String.fromCharCode(65 + answer.correctAnswer)}. {answer.options[answer.correctAnswer] || '无效答案'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant={answer.isCorrect ? 'outline' : 'destructive'}>
                    {answer.isCorrect ? '正确' : '错误'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button onClick={handleReturn} size="lg">
            返回任务
          </Button>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]

  return (
    <div className="container mx-auto py-8 max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">测验</h1>
          <span className="text-sm text-muted-foreground">
            第 {currentQuestion + 1} 题 / 共 {questions.length} 题
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground text-right">
          已回答 {Object.keys(answers).length} / {questions.length} 题
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">第 {currentQuestion + 1} 题</Badge>
            <CardTitle>{currentQ.question}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[currentQ.id]?.toString() || ''}
            onValueChange={(val) => handleAnswerChange(currentQ.id, val)}
            disabled={submitted}
          >
            {currentQ.options.map((opt, optIdx) => (
              <div
                key={optIdx}
                className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                  answers[currentQ.id] === optIdx
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-muted-foreground/20'
                }`}
              >
                <RadioGroupItem value={optIdx.toString()} id={`q${currentQ.id}-opt${optIdx}`} />
                <Label
                  htmlFor={`q${currentQ.id}-opt${optIdx}`}
                  className="flex-1 cursor-pointer"
                >
                  {String.fromCharCode(65 + optIdx)}. {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
        >
          上一题
        </Button>
        <div className="flex gap-2">
          {questions.map((q, idx) => (
            <Button
              key={q.id}
              variant={idx === currentQuestion ? 'default' : isAnswered(q.id) ? 'secondary' : 'outline'}
              size="sm"
              className="w-8 h-8 p-0"
              onClick={() => setCurrentQuestion(idx)}
            >
              {idx + 1}
            </Button>
          ))}
        </div>
        {currentQuestion < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
          >
            下一题
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length || submitting}
          >
            {submitting ? '提交中...' : '提交答案'}
          </Button>
        )}
      </div>

      {currentQuestion === questions.length - 1 && Object.keys(answers).length >= questions.length && (
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? '提交中...' : '提交答案'}
        </Button>
      )}
    </div>
  )
}
