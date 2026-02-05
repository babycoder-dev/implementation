'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  LogOut,
  LayoutDashboard,
  Calendar,
  FileText,
  Video,
  ArrowRight,
  Trophy,
  Target
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string
  deadline: string
  completed: boolean
  progress?: number
  fileType?: 'pdf' | 'video' | 'quiz'
}

interface User {
  name: string
  role: string
}

// Utility function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Utility function to get days remaining
function getDaysRemaining(deadlineString: string): number {
  const deadline = new Date(deadlineString)
  const now = new Date()
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// Utility function to get urgency level
function getUrgencyLevel(daysRemaining: number): 'green' | 'yellow' | 'red' {
  if (daysRemaining < 0) return 'red'
  if (daysRemaining <= 3) return 'red'
  if (daysRemaining <= 7) return 'yellow'
  return 'green'
}

// Utility function to get urgency badge variant
function getUrgencyBadgeVariant(daysRemaining: number): 'destructive' | 'secondary' | 'default' {
  if (daysRemaining < 0) return 'destructive'
  if (daysRemaining <= 3) return 'destructive'
  if (daysRemaining <= 7) return 'secondary'
  return 'default'
}

// Utility function to get file type icon
function getFileTypeIcon(fileType?: string): React.ReactNode {
  switch (fileType) {
    case 'pdf':
      return <FileText className="h-4 w-4 text-red-500" />
    case 'video':
      return <Video className="h-4 w-4 text-blue-500" />
    default:
      return <FileText className="h-4 w-4 text-slate-500" />
  }
}

export default function DashboardClient() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    // Fetch user info and tasks
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()).catch(() => ({ success: false })),
      fetch('/api/tasks').then(r => r.json()).catch(() => ({ success: false, data: [] }))
    ]).then(([userResult, tasksResult]) => {
      if (userResult.success) {
        setUser({
          name: userResult.data?.name || '学员',
          role: userResult.data?.role || 'user'
        })
      }
      if (tasksResult.success) {
        setTasks(tasksResult.data || [])
      }
    }).finally(() => setLoading(false))

    // Update current date every minute
    const interval = setInterval(() => {
      setCurrentDate(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // Calculate statistics
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.completed).length
  const pendingTasks = totalTasks - completedTasks
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Get overdue tasks
  const overdueTasks = tasks.filter(t => !t.completed && getDaysRemaining(t.deadline) < 0)

  // Get upcoming deadline tasks
  const upcomingTasks = tasks
    .filter(t => !t.completed && getDaysRemaining(t.deadline) >= 0)
    .sort((a, b) => getDaysRemaining(a.deadline) - getDaysRemaining(b.deadline))
    .slice(0, 3)

  // Get recent completed tasks
  const recentCompletedTasks = tasks
    .filter(t => t.completed)
    .slice(0, 3)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <LayoutDashboard className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">学习管理系统</h1>
              <p className="text-xs text-slate-500">{formatDate(currentDate.toISOString())}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              <Calendar className="h-4 w-4" />
              <span>{currentDate.toLocaleDateString('zh-CN', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 hidden sm:inline">
                欢迎，<span className="font-medium text-slate-900">{user?.name || '学员'}</span>
              </span>
              <Link href="/api/auth/logout">
                <Button variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  退出
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">我的学习</h2>
          <p className="text-slate-600 mt-1">查看和管理您的学习任务</p>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">总任务数</CardTitle>
              <BookOpen className="h-5 w-5 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{totalTasks}</div>
              <p className="text-xs text-slate-500 mt-1">已分配任务</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">已完成</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{completedTasks}</div>
              <p className="text-xs text-slate-500 mt-1">完成任务数</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">进行中</CardTitle>
              <Clock className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{pendingTasks}</div>
              <p className="text-xs text-slate-500 mt-1">待完成任务</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">完成率</CardTitle>
              <Target className="h-5 w-5 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-600">{completionRate}%</div>
              <Progress value={completionRate} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Progress Section */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Overall Progress Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                学习进度概览
              </CardTitle>
              <CardDescription>
                您已完成 {completedTasks} / {totalTasks} 个任务
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">整体完成度</span>
                    <span className="font-medium text-indigo-600">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-3" />
                </div>
                {overdueTasks.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-red-700">
                      您有 <strong>{overdueTasks.length}</strong> 个已逾期的任务，请尽快完成！
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">快捷操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard" className="block">
                <Button variant="secondary" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    查看所有任务
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/quiz/results" className="block">
                <Button variant="secondary" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    查看测验成绩
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Deadlines */}
        {upcomingTasks.length > 0 && (
          <Card className="mb-8 border-l-4 border-l-yellow-400">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                即将到期的任务
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingTasks.map((task) => {
                  const daysLeft = getDaysRemaining(task.deadline)
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getFileTypeIcon(task.fileType)}
                        <div>
                          <h4 className="font-medium text-slate-900">{task.title}</h4>
                          <p className="text-xs text-slate-500">
                            截止日期: {formatDate(task.deadline)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getUrgencyBadgeVariant(daysLeft)}>
                        {daysLeft <= 0 ? '已过期' : `${daysLeft}天`}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Cards Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-500" />
              学习任务列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">暂无分配的学习任务</p>
                <p className="text-slate-400 text-sm mt-1">请等待管理员分配任务</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tasks.map((task) => {
                  const daysRemaining = getDaysRemaining(task.deadline)
                  const urgency = getUrgencyLevel(daysRemaining)
                  const progress = task.progress || (task.completed ? 100 : 0)

                  return (
                    <Card
                      key={task.id}
                      className={`hover:shadow-lg transition-all duration-300 border-2 ${
                        task.completed
                          ? 'border-green-200 bg-green-50/50'
                          : urgency === 'red'
                            ? 'border-red-200'
                            : urgency === 'yellow'
                              ? 'border-yellow-200'
                              : 'border-slate-200'
                      }`}
                    >
                      <CardContent className="p-5">
                        {/* Task Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getFileTypeIcon(task.fileType)}
                            <Badge
                              variant={task.completed ? 'default' : 'secondary'}
                              className={task.completed ? 'bg-green-600' : ''}
                            >
                              {task.completed ? '已完成' : '进行中'}
                            </Badge>
                          </div>
                          {task.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Badge variant={getUrgencyBadgeVariant(daysRemaining)}>
                              {daysRemaining < 0
                                ? '已逾期'
                                : daysRemaining === 0
                                  ? '今天到期'
                                  : `${daysRemaining}天`}
                            </Badge>
                          )}
                        </div>

                        {/* Task Title */}
                        <h3 className="font-semibold text-lg text-slate-900 mb-2 line-clamp-1">
                          {task.title}
                        </h3>

                        {/* Task Description */}
                        {task.description && (
                          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Deadline */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                          <Clock className="h-3.5 w-3.5" />
                          <span>截止: {formatDate(task.deadline)}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-500">学习进度</span>
                            <span className="font-medium text-slate-700">{progress}%</span>
                          </div>
                          <Progress
                            value={progress}
                            className={`h-2 ${
                              task.completed
                                ? '[&>div]:bg-green-500'
                                : urgency === 'red'
                                  ? '[&>div]:bg-red-500'
                                  : urgency === 'yellow'
                                    ? '[&>div]:bg-yellow-500'
                                    : '[&>div]:bg-indigo-500'
                            }`}
                          />
                        </div>

                        {/* Action Button */}
                        <Link href={`/tasks/${task.id}`} className="block">
                          <Button
                            variant={task.completed ? 'outline' : 'primary'}
                            className="w-full"
                            size="sm"
                          >
                            {task.completed
                              ? '复习课程'
                              : progress > 0
                                ? '继续学习'
                                : '开始学习'}
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Completed Tasks */}
        {recentCompletedTasks.length > 0 && (
          <Card className="mt-8 border-l-4 border-l-green-400">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                最近完成的任务
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {recentCompletedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"
                  >
                    <div className="bg-green-100 p-2 rounded-full">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{task.title}</p>
                      <p className="text-xs text-slate-500">已完成</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
