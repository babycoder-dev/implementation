import { Metadata } from 'next'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, User, Bell, Shield, Database } from 'lucide-react'

export const metadata: Metadata = {
  title: '设置 - 学习管理系统',
}

export default function AdminSettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">系统设置</h1>
          <p className="text-slate-600 mt-1">管理学习管理系统配置</p>
        </div>

        {/* Settings Sections */}
        <div className="grid gap-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary-500" />
                账户设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">用户名</label>
                  <input
                    type="text"
                    defaultValue="admin"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">姓名</label>
                  <input
                    type="text"
                    defaultValue="管理员"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
              <Button>保存更改</Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary-500" />
                通知设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: '任务截止提醒', desc: '在任务截止前24小时发送通知' },
                { label: '新任务分配', desc: '当有新任务分配给您时发送通知' },
                { label: '测验成绩', desc: '完成测验后立即通知成绩' },
                { label: '系统公告', desc: '接收系统重要更新通知' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary-500" />
                安全设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">当前密码</label>
                <input
                  type="password"
                  placeholder="输入当前密码"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">新密码</label>
                  <input
                    type="password"
                    placeholder="输入新密码"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">确认密码</label>
                  <input
                    type="password"
                    placeholder="确认新密码"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
              <Button variant="outline">修改密码</Button>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary-500" />
                系统信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">系统版本</p>
                  <p className="text-sm font-medium text-slate-900">v1.0.0</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">数据库</p>
                  <p className="text-sm font-medium text-slate-900">PostgreSQL 16</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">存储服务</p>
                  <p className="text-sm font-medium text-slate-900">MinIO</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
