'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit } from 'lucide-react'
import Link from 'next/link'

interface User {
  id: string
  username: string
  name: string | null
  role: string
  createdAt: Date
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => {
        if (!res.ok) throw new Error('获取用户列表失败')
        return res.json()
      })
      .then(data => {
        setUsers(data.data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('获取用户列表失败:', err)
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
        <h1 className="text-2xl font-bold">用户管理</h1>
        <Link href="/admin/users/create">
          <Button><Plus className="w-4 h-4 mr-2" />创建用户</Button>
        </Link>
      </div>
      <div className="grid gap-4">
        {users.map(user => (
          <Card key={user.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{user.username}</CardTitle>
              <div className="flex gap-2">
                <Link href={`/admin/users/${user.id}`}>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <p>姓名: {user.name || '-'}</p>
              <p>角色: {user.role}</p>
            </CardContent>
          </Card>
        ))}
        {users.length === 0 && (
          <p className="text-gray-500">暂无用户</p>
        )}
      </div>
    </div>
  )
}
