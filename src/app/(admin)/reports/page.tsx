"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Users, FileText, CheckCircle, TrendingUp } from 'lucide-react';

interface OverviewStats {
  totalUsers: number;
  totalTasks: number;
  completedAssignments: number;
  totalAssignments: number;
  completionRate: number;
  averageScore: number | null;
}

interface DepartmentStat {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  assignmentCount: number;
  completedCount: number;
  completionRate: number;
  averageScore: number | null;
}

interface UserStat {
  id: string;
  username: string;
  name: string;
  role: string;
  department: string | null;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  latestScore: number | null;
  averageScore: number | null;
  passedQuizzes: number;
}

interface TaskStat {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  assignmentCount: number;
  completedCount: number;
  completionRate: number;
  averageScore: number | null;
  passRate: number | null;
}

interface ReportData {
  overview: OverviewStats;
  departments: DepartmentStat[];
  users: UserStat[];
  tasks: TaskStat[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchReportData = useCallback(async (type: string = 'all') => {
    try {
      setLoading(true);
      const fetchData = async (reportType: string) => {
        const res = await fetch(`/api/admin/reports?type=${reportType}`);
        const result = await res.json();
        if (result.success) return result.data;
        return null;
      };

      const overview = await fetchData('overview');
      const departments = await fetchData('departments');
      const users = await fetchData('users');
      const tasks = await fetchData('tasks');

      setData({
        overview: overview?.overview || { totalUsers: 0, totalTasks: 0, completedAssignments: 0, totalAssignments: 0, completionRate: 0, averageScore: null },
        departments: departments?.departments || [],
        users: users?.users || [],
        tasks: tasks?.tasks || [],
      });
    } catch (err) {
      setError('获取报表数据失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleExport = async (format: string) => {
    try {
      const response = await fetch(`/api/admin/reports/export?format=${format}`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `学习报表_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
      alert('导出失败');
    }
  };

  // 简单的进度条组件
  const ProgressBar = ({ value, max = 100, color = 'bg-blue-500' }: { value: number; max?: number; color?: string }) => {
    const percent = Math.min(100, Math.max(0, (value / max) * 100));
    return (
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${percent}%` }} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">加载报表数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">{error || '暂无数据'}</p>
              <Button onClick={() => fetchReportData()}>重新加载</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Top 5 用户
  const topUsers = [...data.users]
    .sort((a, b) => (b.completionRate || 0) - (a.completionRate || 0))
    .slice(0, 5);

  // 按完成率排序的任务
  const sortedTasks = [...data.tasks].sort((a, b) => b.completionRate - a.completionRate);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">报表统计</h1>
          <p className="text-muted-foreground mt-1">学习管理系统数据概览</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('xlsx')}>
            <Download className="w-4 h-4 mr-2" />
            导出报表
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">用户总数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground">注册用户</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">任务总数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalTasks}</div>
            <p className="text-xs text-muted-foreground">学习任务</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">完成率</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {data.overview.completedAssignments}/{data.overview.totalAssignments} 完成
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均分</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.averageScore?.toFixed(1) || '-'}</div>
            <p className="text-xs text-muted-foreground">测验平均分</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b pb-2">
        {['overview', 'departments', 'users', 'tasks'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab === 'overview' ? '数据概览' : tab === 'departments' ? '部门分析' : tab === 'users' ? '个人统计' : '任务统计'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">任务完成情况</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>已完成</span>
                  <span className="font-medium">{data.overview.completedAssignments}</span>
                </div>
                <ProgressBar value={data.overview.completedAssignments} max={data.overview.totalAssignments || 1} color="bg-green-500" />
                <div className="flex justify-between text-sm">
                  <span>未完成</span>
                  <span className="font-medium">{data.overview.totalAssignments - data.overview.completedAssignments}</span>
                </div>
                <ProgressBar value={data.overview.totalAssignments - data.overview.completedAssignments} max={data.overview.totalAssignments || 1} color="bg-gray-300" />
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">总完成率</span>
                    <span className="text-2xl font-bold text-green-600">{data.overview.completionRate}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">部门完成率对比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.departments.slice(0, 6).map((dept) => (
                  <div key={dept.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{dept.name}</span>
                      <span className="font-medium">{dept.completionRate}%</span>
                    </div>
                    <ProgressBar value={dept.completionRate} max={100} color={dept.completionRate >= 70 ? 'bg-green-500' : dept.completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">部门统计详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">部门名称</th>
                    <th className="text-right py-3 px-4">用户数</th>
                    <th className="text-right py-3 px-4">任务数</th>
                    <th className="text-right py-3 px-4">完成数</th>
                    <th className="text-right py-3 px-4">完成率</th>
                    <th className="text-right py-3 px-4">平均分</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departments.map((dept) => (
                    <tr key={dept.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{dept.name}</td>
                      <td className="py-3 px-4 text-right">{dept.userCount}</td>
                      <td className="py-3 px-4 text-right">{dept.assignmentCount}</td>
                      <td className="py-3 px-4 text-right">{dept.completedCount}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={dept.completionRate >= 70 ? 'text-green-600' : dept.completionRate >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                          {dept.completionRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">{dept.averageScore?.toFixed(1) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 5 学习之星</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topUsers.map((user, index) => (
                  <div key={user.id} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{user.name || user.username}</p>
                      <p className="text-sm text-muted-foreground">{user.department || '暂无部门'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{user.completionRate}%</p>
                      <p className="text-xs text-muted-foreground">完成率</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">个人任务完成情况</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topUsers.map((user) => (
                  <div key={user.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="truncate max-w-[150px]">{user.name || user.username}</span>
                      <span className="font-medium">{user.completedTasks}/{user.totalTasks}</span>
                    </div>
                    <ProgressBar value={user.completedTasks} max={user.totalTasks || 1} color="bg-green-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">任务状态分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <span className="flex-1">进行中</span>
                  <span className="font-medium">{data.tasks.filter(t => t.status === 'in_progress').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <span className="flex-1">已完成</span>
                  <span className="font-medium">{data.tasks.filter(t => t.status === 'completed').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-500" />
                  <span className="flex-1">未开始</span>
                  <span className="font-medium">{data.tasks.filter(t => t.status === 'pending').length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">任务完成率排名</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedTasks.slice(0, 6).map((task, index) => (
                  <div key={task.id} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-4">{index + 1}</span>
                    <span className="flex-1 truncate">{task.title}</span>
                    <div className="w-24">
                      <ProgressBar value={task.completionRate} max={100} color={task.completionRate >= 70 ? 'bg-green-500' : task.completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'} />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{task.completionRate}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
