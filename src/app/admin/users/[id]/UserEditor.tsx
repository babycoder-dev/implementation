'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, Trash2, RefreshCw, Save } from 'lucide-react'
import Link from 'next/link'

interface User {
  id: string
  username: string
  name: string | null
  role: string
  createdAt: string
}

interface UserEditorProps {
  userId: string
}

export default function UserEditor({ userId }: UserEditorProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    username: '',
    name: '',
    role: 'user',
  })

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setUser(data.data)
          setForm({
            username: data.data.username,
            name: data.data.name || '',
            role: data.data.role,
          })
        } else {
          setError(data.error || '用户不存在')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('获取用户信息失败')
        setLoading(false)
      })
  }, [userId])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess('用户信息已更新')
        setTimeout(() => {
          router.push('/admin/users')
        }, 1500)
      } else {
        setError(data.error || '更新失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!window.confirm('确定要重置该用户的密码吗？新密码将发送至用户邮箱。')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      })

      const data = await res.json()

      if (res.ok && data.success) {
        alert(`密码已重置，新密码为：${data.data.password}`)
      } else {
        setError(data.error || '重置密码失败')
      }
    } catch {
      setError('网络错误，请重试')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('确定要删除该用户吗？此操作不可撤销。')) {
      return
    }

    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess('用户已删除')
        setTimeout(() => {
          router.push('/admin/users')
        }, 1500)
      } else {
        setError(data.error || '删除失败')
      }
    } catch {
      setError('网络错误，请重试')
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <span className="ml-2">加载中...</span>
        </div>
      </AdminLayout>
    )
  }

  if (error && !user) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              返回用户列表
            </Link>
          </div>
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-red-600">{error}</div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            返回用户列表
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>编辑用户</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">用户名 *</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="请输入用户名"
                required
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="请输入姓名"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">角色</Label>
              <select
                id="role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                disabled={saving}
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存更改
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleResetPassword}
                disabled={saving}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重置密码
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={handleDelete}
                disabled={saving}
                className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除用户
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
