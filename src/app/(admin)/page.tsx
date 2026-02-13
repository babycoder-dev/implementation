/**
 * 管理后台首页 - SRS-06
 * 页面路径: /admin
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, CheckCircle, Clock, TrendingUp, Calendar } from 'lucide-react';

interface DashboardStats {
  userCount: number;
  taskCount: number;
  completionRate: number;
  pendingTaskCount: number;
}

interface RecentTask {
  id: string;
  title: string;
  deadline: string | null;
  status: string;
  progress: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [statsRes, tasksRes] = await Promise.all([
          fetch('/api/admin/dashboard'),
          fetch('/api/tasks?limit=5'),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.data);
        }

        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setRecentTasks(tasksData.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // 统计卡片配置
  const dashboardStats = stats ? [
    {
      title: '用户总数',
      value: stats.userCount.toLocaleString(),
      icon: Users,
      description: '系统注册用户',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '任务总数',
      value: stats.taskCount.toLocaleString(),
      icon: FileText,
      description: '学习任务总数',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: '完成率',
      value: `${stats.completionRate}%`,
      icon: CheckCircle,
      description: '任务完成比例',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: '待完成任务',
      value: stats.pendingTaskCount.toLocaleString(),
      icon: Clock,
      description: '待完成学习任务',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ] : [];

  // 任务状态标签
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: '草稿', className: 'bg-gray-100 text-gray-700' },
      published: { label: '已发布', className: 'bg-blue-100 text-blue-700' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
      archived: { label: '已归档', className: 'bg-slate-100 text-slate-700' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-0.5 rounded text-xs ${config.className}`}>{config.label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据看板</h1>
        <p className="text-gray-500 mt-1">查看系统整体学习情况</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))
          : dashboardStats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* 图表区域 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              本周学习趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">
              图表组件待集成
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              任务完成情况
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">
              图表组件待集成
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近任务 */}
      <Card>
        <CardHeader>
          <CardTitle>最近任务</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : recentTasks.length > 0 ? (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(task.status)}
                      <span className="text-sm text-gray-500">
                        截止: {task.deadline ? new Date(task.deadline).toLocaleDateString('zh-CN') : '无截止日期'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-12 text-right">
                      {task.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              暂无任务数据
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
