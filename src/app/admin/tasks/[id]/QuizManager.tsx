'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { ContentSection } from '@/components/layout/AdminPageTemplate'
import {
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react'

interface QuizQuestion {
  id: string
  taskId: string
  question: string
  options: string[]
  correctAnswer: number
}

interface QuizManagerProps {
  taskId: string
}

interface QuestionFormData {
  question: string
  options: [string, string, string, string]
  correctAnswer: number
}

const initialFormData: QuestionFormData = {
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
}

export default function QuizManager({ taskId }: QuizManagerProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<QuestionFormData>(initialFormData)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof QuestionFormData | 'options', string>>>({})

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/quiz/questions?taskId=${taskId}`)
      const data = await res.json()
      if (data.success) {
        setQuestions(data.data || [])
      } else {
        setError(data.error || '获取题目失败')
      }
    } catch {
      setError('获取题目失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {}

    if (!formData.question.trim()) {
      errors.question = '请输入题目内容'
    } else if (formData.question.length < 5) {
      errors.question = '题目内容至少需要5个字符'
    }

    const emptyOptions = formData.options.filter((opt) => !opt.trim())
    if (emptyOptions.length > 0) {
      errors.options = '所有选项都不能为空'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setFormErrors({})
    setEditingId(null)
    setIsFormOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        taskId,
        question: formData.question.trim(),
        options: formData.options.map((opt) => opt.trim()),
        correctAnswer: formData.correctAnswer,
      }

      const url = editingId
        ? `/api/quiz/questions/${editingId}`
        : '/api/quiz/questions'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(editingId ? '题目已更新' : '题目已添加')
        resetForm()
        fetchQuestions()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || '操作失败')
      }
    } catch {
      setError('操作失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (question: QuizQuestion) => {
    setFormData({
      question: question.question,
      options: [
        question.options[0] || '',
        question.options[1] || '',
        question.options[2] || '',
        question.options[3] || '',
      ] as [string, string, string, string],
      correctAnswer: question.correctAnswer,
    })
    setEditingId(question.id)
    setIsFormOpen(true)
    setError(null)
    setSuccess(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此题目吗？此操作不可恢复。')) {
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/quiz/questions/${id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (data.success) {
        setSuccess('题目已删除')
        fetchQuestions()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || '删除失败')
      }
    } catch {
      setError('删除失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    resetForm()
  }

  if (loading) {
    return (
      <ContentSection title="测验设置">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">加载中...</span>
        </div>
      </ContentSection>
    )
  }

  return (
    <ContentSection
      title="测验题目"
      action={
        !isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            添加题目
          </Button>
        )
      }
    >
      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Add/Edit Form */}
      {isFormOpen && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? '编辑题目' : '添加新题目'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Question Input */}
              <div>
                <Label htmlFor="question">题目内容</Label>
                <Input
                  id="question"
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  placeholder="请输入题目内容..."
                  disabled={submitting}
                  className={formErrors.question ? 'border-red-500' : ''}
                />
                {formErrors.question && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.question}</p>
                )}
              </div>

              {/* Options */}
              <div>
                <Label className="mb-2 block">选项（选择正确答案）</Label>
                <RadioGroup
                  value={formData.correctAnswer.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, correctAnswer: parseInt(value) })
                  }
                  className="space-y-3"
                >
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1">
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...formData.options] as [string, string, string, string]
                            newOptions[index] = e.target.value
                            setFormData({ ...formData, options: newOptions })
                          }}
                          placeholder={`选项 ${index + 1}`}
                          disabled={submitting}
                        />
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {formErrors.options && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.options}</p>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {editingId ? '更新题目' : '添加题目'}
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
                  <X className="w-4 h-4 mr-2" />
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Questions List */}
      {questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((q, index) => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">题目 {index + 1}</Badge>
                      <Badge variant="outline">
                        正确答案: {String.fromCharCode(65 + q.correctAnswer)}
                      </Badge>
                    </div>
                    <p className="text-slate-900 font-medium mb-3">{q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, optIndex) => (
                        <div
                          key={optIndex}
                          className={`px-3 py-2 rounded-md text-sm ${
                            optIndex === q.correctAnswer
                              ? 'bg-green-50 border border-green-200 text-green-800'
                              : 'bg-slate-50 border border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(q)}
                      disabled={submitting}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(q.id)}
                      disabled={submitting}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          {isFormOpen ? (
            <p className="text-sm">请在下方填写题目信息</p>
          ) : (
            <>
              <p className="mb-2">暂无测验题目</p>
              <p className="text-sm">点击「添加题目」为任务创建测验</p>
            </>
          )}
        </div>
      )}
    </ContentSection>
  )
}
