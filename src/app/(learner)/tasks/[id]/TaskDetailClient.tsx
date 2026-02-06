'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { PDFViewer } from '@/components/PDFViewer'
import { VideoPlayer } from '@/components/VideoPlayer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, FileText, Video, HelpCircle, Play, Pause, Download } from 'lucide-react'

interface TaskFile {
  id: string
  title: string
  fileUrl: string
  fileType: string
  fileSize: number
  order: number
}

interface QuizQuestion {
  id: string
  question: string
  options: string[]
}

interface Task {
  id: string
  title: string
  description: string | null
  deadline: string | null
  createdBy: string
  createdAt: string
}

interface TaskDetailClientProps {
  task: Task
  files: TaskFile[]
  questions: QuizQuestion[]
}

type TabType = 'files' | 'videos' | 'quiz'

interface QuizSectionProps {
  questions: QuizQuestion[]
  taskId: string
}

function QuizSection({ questions, taskId }: QuizSectionProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, { isCorrect: boolean; submitted: boolean }>>({})

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    if (results[questionId]?.submitted) return

    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }))
  }

  const handleSubmit = async (questionId: string) => {
    const answer = answers[questionId]
    if (answer === undefined) return

    setSubmitting((prev) => ({ ...prev, [questionId]: true }))

    try {
      const response = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer }),
      })

      const data = await response.json()

      setResults((prev) => ({
        ...prev,
        [questionId]: {
          isCorrect: data.isCorrect,
          submitted: true,
        },
      }))
    } catch {
      setResults((prev) => ({
        ...prev,
        [questionId]: {
          isCorrect: false,
          submitted: true,
        },
      }))
    } finally {
      setSubmitting((prev) => ({ ...prev, [questionId]: false }))
    }
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">本任务暂无测验题目</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {questions.map((question, index) => {
        const result = results[question.id]

        return (
          <Card key={question.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-medium text-sm">
                  {index + 1}
                </span>
                <div className="flex-1 space-y-3">
                  <h4 className="font-medium">{question.question}</h4>

                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = answers[question.id] === optionIndex
                      const isSubmitted = result?.submitted
                      const isCorrect = result?.isCorrect

                      let buttonClass = 'w-full text-left p-3 rounded-lg border text-sm transition-colors '

                      if (isSubmitted) {
                        if (isCorrect && isSelected) {
                          buttonClass += 'bg-green-50 border-green-500 text-green-700'
                        } else if (!isCorrect && isSelected) {
                          buttonClass += 'bg-red-50 border-red-500 text-red-700'
                        } else {
                          buttonClass += 'bg-slate-50 border-slate-200 text-slate-600'
                        }
                      } else {
                        buttonClass += isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }

                      return (
                        <button
                          key={optionIndex}
                          onClick={() => handleAnswerSelect(question.id, optionIndex)}
                          disabled={isSubmitted}
                          className={buttonClass}
                        >
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + optionIndex)}.
                          </span>
                          {option}
                        </button>
                      )
                    })}
                  </div>

                  {!result?.submitted && (
                    <Button
                      onClick={() => handleSubmit(question.id)}
                      disabled={answers[question.id] === undefined || submitting[question.id]}
                      size="sm"
                    >
                      {submitting[question.id] ? '提交中...' : '提交答案'}
                    </Button>
                  )}

                  {result?.submitted && (
                    <div className={`p-3 rounded-lg text-sm ${result.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {result.isCorrect ? '回答正确！' : `回答错误`}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

interface FileViewerProps {
  file: TaskFile
  onPageChange: (fileId: string, pageNum: number, totalPages: number) => void
  onFinish: (fileId: string) => void
  onTimeUpdate?: (fileId: string, duration: number) => void
}

function FileViewer({ file, onPageChange, onFinish, onTimeUpdate }: FileViewerProps) {
  const isPdf = file.fileType.toLowerCase() === 'pdf'

  if (!isPdf) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {file.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>格式: {file.fileType.toUpperCase()}</span>
              <span>大小: {(file.fileSize / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="bg-slate-50 rounded-lg p-8 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">此文件类型不支持在线预览</p>
              <a
                href={file.fileUrl}
                download
                className="inline-flex items-center gap-2 mt-3 text-sm text-blue-600 hover:text-blue-700"
              >
                <Download className="h-4 w-4" />
                下载文件
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {file.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>格式: PDF</span>
            <span>大小: {(file.fileSize / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <PDFViewer
            url={file.fileUrl}
            fileId={file.id}
            onPageChange={(id, pageNum, totalPages) => onPageChange(id, pageNum, totalPages)}
            onFinish={(id) => onFinish(id)}
            onTimeUpdate={onTimeUpdate}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default function TaskDetailClient({ task, files, questions }: TaskDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('files')

  // Filter files by type
  const pdfFiles = files.filter((f) => f.fileType.toLowerCase() === 'pdf')
  const videoFiles = files.filter((f) => f.fileType.toLowerCase() === 'video')

  // Log PDF page changes
  const handlePdfPageChange = useCallback(async (fileId: string, pageNum: number, totalPages: number) => {
    try {
      await fetch('/api/learning/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          actionType: pageNum === 1 ? 'open' : 'next_page',
          pageNum,
        }),
      })
    } catch {
      // Silently fail - don't interrupt user experience
    }
  }, [])

  // Log PDF finish
  const handlePdfFinish = useCallback(async (fileId: string) => {
    try {
      await fetch('/api/learning/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          actionType: 'finish',
          pageNum: 1,
        }),
      })
    } catch {
      // Silently fail
    }
  }, [])

  // Record PDF study time
  const handlePdfTimeUpdate = useCallback(async (fileId: string, duration: number) => {
    try {
      await fetch('/api/learning/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          actionType: 'time',
          duration,
          pageNum: 1,
        }),
      })
    } catch {
      // Silently fail
    }
  }, [])

  // Update video progress
  const handleVideoProgressUpdate = useCallback(async (fileId: string, currentTime: number, duration: number) => {
    try {
      await fetch('/api/learning/video/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          currentTime,
          duration,
        }),
      })
    } catch {
      // Silently fail
    }
  }, [])

  // Log video actions (supports extended actions for anomaly detection)
  const handleVideoActionLog = useCallback(
    async (
      fileId: string,
      action: 'play' | 'pause' | 'seek' | 'finish' | 'muted' | 'speed_changed',
      currentTime: number,
      metadata?: Record<string, unknown>
    ) => {
      try {
        await fetch('/api/learning/video/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId,
            action,
            currentTime,
            ...metadata,
          }),
        })
      } catch {
        // Silently fail
      }
    },
    []
  )

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'files', label: '学习资料', count: pdfFiles.length },
    { id: 'videos', label: '视频课程', count: videoFiles.length },
    { id: 'quiz', label: '测验', count: questions.length },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/dashboard" className="hover:text-slate-700 flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" />
              返回仪表盘
            </Link>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">{task.title}</h1>
          {task.description && (
            <p className="text-sm text-slate-600 mt-1">{task.description}</p>
          )}
          {task.deadline && (
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              截止日期: {new Date(task.deadline).toLocaleDateString('zh-CN')}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as TabType)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              学习资料
              {pdfFiles.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pdfFiles.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              视频课程
              {videoFiles.length > 0 && (
                <Badge variant="secondary" className="ml-1">{videoFiles.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              测验
              {questions.length > 0 && (
                <Badge variant="secondary" className="ml-1">{questions.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4">
            {pdfFiles.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">本任务暂无学习资料</p>
                </CardContent>
              </Card>
            ) : (
              pdfFiles
                .sort((a, b) => a.order - b.order)
                .map((file) => (
                  <FileViewer
                    key={file.id}
                    file={file}
                    onPageChange={handlePdfPageChange}
                    onFinish={handlePdfFinish}
                    onTimeUpdate={handlePdfTimeUpdate}
                  />
                ))
            )}
          </TabsContent>

          <TabsContent value="videos" className="space-y-4">
            {videoFiles.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Video className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">本任务暂无视频课程</p>
                </CardContent>
              </Card>
            ) : (
              videoFiles
                .sort((a, b) => a.order - b.order)
                .map((file) => (
                  <VideoPlayer
                    key={file.id}
                    file={file}
                    onProgressUpdate={handleVideoProgressUpdate}
                    onActionLog={handleVideoActionLog}
                  />
                ))
            )}
          </TabsContent>

          <TabsContent value="quiz">
            <QuizSection questions={questions} taskId={task.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
