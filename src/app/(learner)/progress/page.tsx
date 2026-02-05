'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen,
  CheckCircle,
  Video,
  HelpCircle,
  Clock,
  ArrowLeft,
  Trophy,
  Play
} from 'lucide-react'

interface ProgressData {
  totalTasks: number
  completedTasks: number
  quizStats: {
    totalQuestions: number
    answeredCount: number
    correctCount: number
  }
  videoStats: {
    totalVideos: number
    watchedCount: number
    totalWatchTime: number
  }
}

interface ApiResponse {
  success: boolean
  data?: ProgressData
  error?: string
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function calculateOverallProgress(data: ProgressData): number {
  const totalItems = data.totalTasks + data.quizStats.totalQuestions + data.videoStats.totalVideos
  if (totalItems === 0) return 0

  const completedItems =
    data.completedTasks +
    data.quizStats.answeredCount +
    data.videoStats.watchedCount

  return Math.round((completedItems / totalItems) * 100)
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/learning/progress')
      .then((response) => response.json())
      .then((result: ApiResponse) => {
        if (result.success && result.data) {
          setProgress(result.data)
        } else {
          setError(result.error || '获取学习进度失败')
        }
      })
      .catch(() => {
        setError('网络错误，请稍后重试')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-2 text-slate-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              重新加载
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-8 text-center">
            <p className="text-slate-600">暂无学习进度数据</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const overallProgress = calculateOverallProgress(progress)
  const taskCompletionRate = progress.totalTasks > 0
    ? Math.round((progress.completedTasks / progress.totalTasks) * 100)
    : 0
  const quizAccuracy = progress.quizStats.answeredCount > 0
    ? Math.round((progress.quizStats.correctCount / progress.quizStats.answeredCount) * 100)
    : 0
  const videoCompletionRate = progress.videoStats.totalVideos > 0
    ? Math.round((progress.videoStats.watchedCount / progress.videoStats.totalVideos) * 100)
    : 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">学习进度</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Overall Progress */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              学习总体完成度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Progress value={overallProgress} className="flex-1 h-3" />
                <span className="text-2xl font-bold text-slate-900 min-w-[4rem] text-right">
                  {overallProgress}%
                </span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>任务完成</span>
                <span>测验答题</span>
                <span>视频观看</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Stats */}
        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              任务进度
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              测验成绩
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              视频学习
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">学习任务</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">已完成任务</p>
                      <p className="text-xl font-bold">{progress.completedTasks}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">总任务数</p>
                    <p className="text-xl font-semibold">{progress.totalTasks}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">完成率</span>
                    <span className="font-medium">{taskCompletionRate}%</span>
                  </div>
                  <Progress value={taskCompletionRate} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quiz">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">测验成绩</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{progress.quizStats.correctCount}</p>
                    <p className="text-sm text-slate-600">答对题目</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold">{progress.quizStats.answeredCount}</p>
                    <p className="text-sm text-slate-600">已答题数</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold">{progress.quizStats.totalQuestions}</p>
                    <p className="text-sm text-slate-600">总题数</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">正确率</span>
                    <span className="font-medium">{quizAccuracy}%</span>
                  </div>
                  <Progress value={quizAccuracy} className={quizAccuracy >= 80 ? '[&>div]:bg-green-500' : quizAccuracy >= 60 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">视频学习</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Play className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">已看完</p>
                      <p className="text-xl font-bold">{progress.videoStats.watchedCount}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">总视频数</p>
                    <p className="text-xl font-semibold">{progress.videoStats.totalVideos}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">完成率</span>
                    <span className="font-medium">{videoCompletionRate}%</span>
                  </div>
                  <Progress value={videoCompletionRate} />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 pt-2 border-t">
                  <Clock className="h-4 w-4" />
                  <span>总观看时长: <span className="font-mono font-medium">{formatDuration(progress.videoStats.totalWatchTime)}</span></span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
