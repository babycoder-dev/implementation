'use client'

import { useEffect, useState } from 'react'

interface DashboardData {
  taskCount: number
  userCount: number
  assignmentCount: number
  answerTotal: number
  answerCorrect: number
}

export default function AdminPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-8">加载中...</div>
  }

  if (!data) {
    return <div className="p-8">加载失败</div>
  }

  const accuracyRate = data.answerTotal > 0
    ? Math.round((data.answerCorrect / data.answerTotal) * 100)
    : 0

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">管理后台</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="任务总数" value={data.taskCount} />
        <StatCard title="用户总数" value={data.userCount} />
        <StatCard title="分配总数" value={data.assignmentCount} />
        <StatCard title="答题正确率" value={`${accuracyRate}%`} />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">快速操作</h2>
        <div className="flex gap-4">
          <QuickAction label="创建任务" href="/admin/tasks/new" />
          <QuickAction label="管理用户" href="/admin/users" />
          <QuickAction label="查看报表" href="/admin/reports" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="text-gray-500 text-sm">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  )
}

function QuickAction({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      {label}
    </a>
  )
}
