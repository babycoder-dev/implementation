import { Metadata } from 'next'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, PieChart, TrendingUp } from 'lucide-react'

export const metadata: Metadata = {
  title: '数据报表 - 学习管理系统',
}

export default function AdminReportsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">数据报表</h1>
          <p className="text-slate-600 mt-1">学习数据统计与分析</p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">学习完成率</CardTitle>
              <TrendingUp className="h-5 w-5 text-primary-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary-600">78%</div>
              <p className="text-xs text-slate-500 mt-1">较上周 +5%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均学习时长</CardTitle>
              <BarChart3 className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">2.5h</div>
              <p className="text-xs text-slate-500 mt-1">每天</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">测验通过率</CardTitle>
              <PieChart className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">85%</div>
              <p className="text-xs text-slate-500 mt-1">已通过 17/20</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>学习趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center bg-slate-50 rounded-lg">
              <div className="text-center text-slate-500">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">图表展示区域</p>
                <p className="text-sm">集成图表库后显示学习趋势</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Table */}
        <Card>
          <CardHeader>
            <CardTitle>最近学习活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { user: '张三', action: '完成', item: 'React 基础教程', time: '10分钟前' },
                { user: '李四', action: '开始学习', item: 'TypeScript 进阶', time: '30分钟前' },
                { user: '王五', action: '通过测验', item: 'Node.js 实战', time: '1小时前' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-700">
                        {activity.user[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {activity.user}
                        <span className="text-slate-500 font-normal"> {activity.action} </span>
                        {activity.item}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
