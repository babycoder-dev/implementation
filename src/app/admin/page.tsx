'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Users,
  FileText,
  Trophy,
  Plus,
  BarChart3,
  TrendingUp,
  Calendar,
  ArrowRight,
  UserPlus,
  FileBarChart,
  Clock,
  Target,
  BookOpen,
  Activity,
  Zap,
  Brain,
} from 'lucide-react'

interface DashboardData {
  taskCount: number
  userCount: number
  assignmentCount: number
  answerTotal: number
  answerCorrect: number
  questionCount: number
  fileCount: number
  completionRate: number
  answerCorrectRate: number
  newUsersThisWeek: number
  newTasksThisWeek: number
  activeLearnersThisWeek: number
  totalLearningMinutes: number
  recentTasks: Array<{
    id: string
    title: string
    createdAt: string
    status: string
  }>
  recentUsers: Array<{
    id: string
    username: string
    createdAt: string
    role: string
  }>
  recentActivities: Array<{
    id: string
    userId: string
    username: string
    fileTitle: string
    actionType: string
    duration: number
    createdAt: string
  }>
  dailyAnswerTrend: Array<{
    date: string
    total: number
    correct: number
  }>
  topLearners: Array<{
    userId: string
    username: string
    totalMinutes: number
    activityCount: number
  }>
  trend: {
    users: string
    tasks: string
    assignments: string
    completionRate: string
    activeLearners: string
  }
}

interface KPIProps {
  title: string
  value: string | number
  trend: string
  trendLabel?: string
  icon: React.ReactNode
  iconColor: string
  bgColor: string
  description?: string
}

function KPICard({ title, value, trend, trendLabel, icon, iconColor, bgColor, description }: KPIProps) {
  const isPositive = trend.startsWith('+')
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        <div className="flex items-center mt-1">
          <TrendingUp className={`h-3 w-3 ${isPositive ? 'text-green-500' : 'text-slate-400'} mr-1`} />
          <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-slate-500'}`}>
            {trend}
          </span>
          {trendLabel && <span className="text-xs text-slate-400 ml-1">{trendLabel}</span>}
        </div>
        {description && (
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    active: { label: '进行中', variant: 'default' },
    completed: { label: '已完成', variant: 'secondary' },
    draft: { label: '草稿', variant: 'outline' },
  }
  const config = statusMap[status] || { label: status, variant: 'outline' }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

function getRoleBadge(role: string) {
  const roleMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    learner: { label: '学习者', variant: 'secondary' },
    admin: { label: '管理员', variant: 'default' },
    teacher: { label: '教师', variant: 'outline' },
  }
  const config = roleMap[role] || { label: role, variant: 'outline' }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

function getActionLabel(actionType: string) {
  const actionMap: Record<string, { label: string; icon: React.ReactNode }> = {
    open: { label: '打开文档', icon: <BookOpen className="h-4 w-4" /> },
    next_page: { label: '阅读', icon: <FileText className="h-4 w-4" /> },
    finish: { label: '完成阅读', icon: <Target className="h-4 w-4" /> },
    time: { label: '学习', icon: <Clock className="h-4 w-4" /> },
  }
  return actionMap[actionType] || { label: actionType, icon: <Activity className="h-4 w-4" /> }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTimeFromNow(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return formatDate(dateStr)
}

export default function AdminPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [currentDate, setCurrentDate] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Set current date
    const now = new Date()
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    setCurrentDate(
      `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekDays[now.getDay()]}`
    )

    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data)
        }
      })
      .catch(() => {
        // Use default data on error
      })
      .finally(() => setMounted(true))
  }, [])

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">管理后台</h1>
              <p className="text-slate-500 mt-1">数据概览</p>
            </div>
          </div>
          <div className="animate-pulse">
            <div className="h-32 bg-slate-200 rounded-lg mb-6"></div>
            <div className="h-64 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // Calculate rates
  const completionRate = data?.completionRate || 0
  const answerCorrectRate = data?.answerCorrectRate || 0

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">管理后台</h1>
            <p className="text-slate-500 mt-1">数据概览</p>
          </div>
          <div className="flex items-center text-slate-500 text-sm">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{currentDate}</span>
          </div>
        </div>

        {/* Main KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="用户总数"
            value={data?.userCount || 0}
            trend={data?.trend.users || '+0'}
            trendLabel="本周新增"
            icon={<Users className="h-4 w-4" />}
            iconColor="text-blue-600"
            bgColor="bg-blue-100"
            description={`本周新增 ${data?.newUsersThisWeek || 0} 人`}
          />
          <KPICard
            title="任务总数"
            value={data?.taskCount || 0}
            trend={data?.trend.tasks || '+0'}
            trendLabel="本周新增"
            icon={<FileText className="h-4 w-4" />}
            iconColor="text-indigo-600"
            bgColor="bg-indigo-100"
            description={`本周新增 ${data?.newTasksThisWeek || 0} 个`}
          />
          <KPICard
            title="任务分配"
            value={data?.assignmentCount || 0}
            trend="+0"
            icon={<BarChart3 className="h-4 w-4" />}
            iconColor="text-emerald-600"
            bgColor="bg-emerald-100"
            description={`完成率 ${completionRate}%`}
          />
          <KPICard
            title="答题正确率"
            value={`${answerCorrectRate}%`}
            trend="+0"
            icon={<Brain className="h-4 w-4" />}
            iconColor="text-amber-600"
            bgColor="bg-amber-100"
            description={`${data?.answerTotal || 0} 次答题`}
          />
        </div>

        {/* Secondary KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="活跃学习者"
            value={data?.activeLearnersThisWeek || 0}
            trend="本周"
            icon={<Activity className="h-4 w-4" />}
            iconColor="text-cyan-600"
            bgColor="bg-cyan-100"
          />
          <KPICard
            title="学习时长"
            value={`${data?.totalLearningMinutes || 0}分钟`}
            trend="总计"
            icon={<Clock className="h-4 w-4" />}
            iconColor="text-purple-600"
            bgColor="bg-purple-100"
          />
          <KPICard
            title="题目数量"
            value={data?.questionCount || 0}
            trend="可用"
            icon={<Target className="h-4 w-4" />}
            iconColor="text-rose-600"
            bgColor="bg-rose-100"
          />
          <KPICard
            title="资料文件"
            value={data?.fileCount || 0}
            trend="总数"
            icon={<BookOpen className="h-4 w-4" />}
            iconColor="text-teal-600"
            bgColor="bg-teal-100"
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Plus className="h-5 w-5 mr-2 text-primary-500" />
              快速操作
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/admin/tasks/create">
                <Button
                  variant="primary"
                  className="w-full h-auto py-4 flex-col gap-2"
                >
                  <FileText className="h-5 w-5" />
                  <div>
                    <div className="font-medium">创建任务</div>
                    <div className="text-xs opacity-80">发布新的学习任务</div>
                  </div>
                </Button>
              </Link>

              <Link href="/admin/users/create">
                <Button
                  variant="primary"
                  className="w-full h-auto py-4 flex-col gap-2"
                >
                  <UserPlus className="h-5 w-5" />
                  <div>
                    <div className="font-medium">添加用户</div>
                    <div className="text-xs opacity-80">注册新用户账号</div>
                  </div>
                </Button>
              </Link>

              <Link href="/admin/reports">
                <Button
                  variant="primary"
                  className="w-full h-auto py-4 flex-col gap-2"
                >
                  <FileBarChart className="h-5 w-5" />
                  <div>
                    <div className="font-medium">查看报表</div>
                    <div className="text-xs opacity-80">数据分析与报表</div>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Learning Progress Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Task Completion Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-amber-500" />
                任务完成情况
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">整体完成进度</span>
                  <span className="font-medium text-slate-900">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-3" />
                <div className="grid gap-4 md:grid-cols-3 mt-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {data?.answerCorrect || 0}
                    </div>
                    <div className="text-sm text-slate-500">正确答案数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {(data?.answerTotal || 0) - (data?.answerCorrect || 0)}
                    </div>
                    <div className="text-sm text-slate-500">错误答案数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {data?.answerTotal || 0}
                    </div>
                    <div className="text-sm text-slate-500">答题总数</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Learners */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Zap className="h-5 w-5 mr-2 text-purple-500" />
                活跃学习者
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.topLearners && data.topLearners.length > 0 ? (
                  data.topLearners.map((learner, index) => (
                    <div
                      key={learner.userId}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-amber-100 text-amber-600' :
                          index === 1 ? 'bg-slate-200 text-slate-600' :
                          index === 2 ? 'bg-orange-100 text-orange-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{learner.username}</div>
                          <div className="text-xs text-slate-500">
                            {learner.activityCount} 次学习活动
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-slate-900">{learner.totalMinutes}分钟</div>
                        <div className="text-xs text-slate-500">学习时长</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    暂无学习数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity and Lists Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Activity className="h-5 w-5 mr-2 text-cyan-500" />
                近期活动
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.recentActivities && data.recentActivities.length > 0 ? (
                  data.recentActivities.map(activity => {
                    const action = getActionLabel(activity.actionType)
                    return (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-md shadow-sm text-slate-600">
                            {action.icon}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              <span className="text-blue-600">{activity.username}</span>
                              <span className="text-slate-600"> - {activity.fileTitle}</span>
                            </div>
                            <div className="text-xs text-slate-500">
                              {action.label}
                              {activity.duration > 0 && ` · ${Math.round(activity.duration / 60)}分钟`}
                              <span className="mx-1">·</span>
                              {formatTimeFromNow(activity.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    暂无学习活动
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">最新任务</CardTitle>
              <Link href="/admin/tasks">
                <Button variant="ghost" size="sm">
                  查看全部
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.recentTasks && data.recentTasks.length > 0 ? (
                  data.recentTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-md shadow-sm">
                          <FileText className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{task.title}</div>
                          <div className="text-xs text-slate-500">
                            {formatDate(task.createdAt)}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    暂无任务数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">最新用户</CardTitle>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm">
                  查看全部
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.recentUsers && data.recentUsers.length > 0 ? (
                  data.recentUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full shadow-sm">
                          <Users className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{user.username}</div>
                          <div className="text-xs text-slate-500">
                            {formatDate(user.createdAt)}
                          </div>
                        </div>
                      </div>
                      {getRoleBadge(user.role)}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    暂无用户数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Daily Trend Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-emerald-500" />
                每日答题趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.dailyAnswerTrend && data.dailyAnswerTrend.length > 0 ? (
                  <div className="space-y-3">
                    {data.dailyAnswerTrend.map((day, index) => {
                      const rate = day.total > 0 ? Math.round((day.correct / day.total) * 100) : 0
                      const date = new Date(day.date)
                      const dayName = date.toLocaleDateString('zh-CN', { weekday: 'short' })
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">{dayName}</span>
                            <span className="text-slate-500">{day.total}题 · 正确率{rate}%</span>
                          </div>
                          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    本周暂无答题数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-slate-500" />
              数据概览
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">用户</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{data?.userCount || 0}</div>
                <div className="text-xs text-blue-600">本周 +{data?.newUsersThisWeek || 0}</div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-600">任务</span>
                </div>
                <div className="text-2xl font-bold text-indigo-900">{data?.taskCount || 0}</div>
                <div className="text-xs text-indigo-600">本周 +{data?.newTasksThisWeek || 0}</div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-600">完成率</span>
                </div>
                <div className="text-2xl font-bold text-emerald-900">{completionRate}%</div>
                <div className="text-xs text-emerald-600">{data?.assignmentCount || 0} 次分配</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">学习时长</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{data?.totalLearningMinutes || 0}m</div>
                <div className="text-xs text-purple-600">活跃用户 {data?.activeLearnersThisWeek || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
