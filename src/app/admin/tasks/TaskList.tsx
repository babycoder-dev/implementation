'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit } from 'lucide-react'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  createdAt: Date
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => {
        if (!res.ok) throw new Error('获取任务列表失败')
        return res.json()
      })
      .then(data => {
        setTasks(data.data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('获取任务列表失败:', err)
        setError('加载失败，请刷新重试')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-4">加载中...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">任务管理</h1>
        <Link href="/admin/tasks/create">
          <Button><Plus className="w-4 h-4 mr-2" />创建任务</Button>
        </Link>
      </div>
      <div className="grid gap-4">
        {tasks.map(task => (
          <Card key={task.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{task.title}</CardTitle>
              <div className="flex gap-2">
                <Link href={`/admin/tasks/${task.id}`}>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <p>状态: {task.status}</p>
            </CardContent>
          </Card>
        ))}
        {tasks.length === 0 && (
          <p className="text-gray-500">暂无任务</p>
        )}
      </div>
    </div>
  )
}
