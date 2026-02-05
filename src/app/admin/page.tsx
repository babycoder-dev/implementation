'use client'

import { useEffect, useState, use } from 'react'
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
  FileBarChart
} from 'lucide-react'

interface DashboardData {
  taskCount: number
  userCount: number
  assignmentCount: number
  answerCorrect: number
  answerTotal: number
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
  trend: {
    users: string
    tasks: string
    assignments: string
    completionRate: string
  }
}

interface KPIProps {
  title: string
  value: string | number
  trend: string
  icon: React.ReactNode
  iconColor: string
  bgColor: string
}

function KPICard({ title, value, trend, icon, iconColor, bgColor }: KPIProps) {
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
          <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
          <span className="text-xs text-green-600 font-medium">{trend}</span>
          <span className="text-xs text-slate-400 ml-1">本周</span>
        </div>
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

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

export default function AdminPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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
      .finally(() => setLoading(false))
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

  // Calculate completion rate
  const completionRate = data && data.answerTotal > 0
    ? Math.round((data.answerCorrect / data.answerTotal) * 100)
    : 0

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

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="用户总数"
            value={data?.userCount || 0}
            trend={data?.trend.users || '+0%'}
            icon={<Users className="h-4 w-4" />}
            iconColor="text-blue-600"
            bgColor="bg-blue-100"
          />
          <KPICard
            title="任务总数"
            value={data?.taskCount || 0}
            trend={data?.trend.tasks || '+0%'}
            icon={<FileText className="h-4 w-4" />}
            iconColor="text-indigo-600"
            bgColor="bg-indigo-100"
          />
          <KPICard
            title="任务分配"
            value={data?.assignmentCount || 0}
            trend={data?.trend.assignments || '+0%'}
            icon={<BarChart3 className="h-4 w-4" />}
            iconColor="text-emerald-600"
            bgColor="bg-emerald-100"
          />
          <KPICard
            title="完成率"
            value={`${completionRate}%`}
            trend={data?.trend.completionRate || '+0%'}
            icon={<Trophy className="h-4 w-4" />}
            iconColor="text-amber-600"
            bgColor="bg-amber-100"
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

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
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
        </div>

        {/* Statistics Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">任务完成率</CardTitle>
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
      </div>
    </AdminLayout>
  )
}
