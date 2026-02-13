"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Download,
  Building2,
  FileText,
} from "lucide-react";

interface OverviewStats {
  totalUsers: number;
  totalTasks: number;
  completedAssignments: number;
  totalAssignments: number;
  completionRate: number;
  averageScore: number | null;
}

interface DepartmentStats {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  assignmentCount: number;
  completedCount: number;
  completionRate: number;
  averageScore: number | null;
}

interface UserStats {
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

interface TaskStats {
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

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [departments, setDepartments] = useState<DepartmentStats[]>([]);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [tasks, setTasks] = useState<TaskStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch overview
      const overviewRes = await fetch("/api/admin/reports?type=overview");
      const overviewData = await overviewRes.json();
      if (overviewData.success) {
        setOverview(overviewData.data.overview);
      }

      // Fetch departments
      const deptRes = await fetch("/api/admin/reports?type=departments");
      const deptData = await deptRes.json();
      if (deptData.success) {
        setDepartments(deptData.data.departments);
      }

      // Fetch users with department filter
      const userUrl = selectedDepartment === "all"
        ? "/api/admin/reports?type=users"
        : `/api/admin/reports?type=users&departmentId=${selectedDepartment}`;
      const userRes = await fetch(userUrl);
      const userData = await userRes.json();
      if (userData.success) {
        setUsers(userData.data.users);
      }

      // Fetch tasks
      const taskRes = await fetch("/api/admin/reports?type=tasks");
      const taskData = await taskRes.json();
      if (taskData.success) {
        setTasks(taskData.data.tasks);
      }
    } catch (error) {
      console.error("Failed to fetch report data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/reports/export?format=xlsx");
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `学习报表_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      alert("导出失败，请稍后重试");
    }
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">学习报表</h1>
          <p className="text-gray-500 mt-1">查看和导出学习数据统计</p>
        </div>
        <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">
          <Download className="w-4 h-4 mr-2" />
          导出 Excel
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="departments">部门</TabsTrigger>
          <TabsTrigger value="users">个人</TabsTrigger>
          <TabsTrigger value="tasks">任务</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="text-center py-12">加载中...</div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      总用户数
                    </CardTitle>
                    <Users className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overview?.totalUsers || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      总任务数
                    </CardTitle>
                    <BookOpen className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overview?.totalTasks || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      已完成
                    </CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {overview?.completedAssignments || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      / {overview?.totalAssignments || 0} 个分配任务
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      完成率
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getCompletionColor(overview?.completionRate || 0)}`}>
                      {overview?.completionRate || 0}%
                    </div>
                    <Progress value={overview?.completionRate || 0} className="h-2 mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">平均测验分数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {overview && overview.averageScore !== null ? `${overview.averageScore}分` : "暂无数据"}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">部门数量</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{departments.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">活跃用户</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {users.filter(u => u.completedTasks > 0).length}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">至少完成1个任务</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                部门统计
              </CardTitle>
              <CardDescription>各部门的学习完成情况和测验成绩</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">加载中...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>部门名称</TableHead>
                      <TableHead className="text-right">用户数</TableHead>
                      <TableHead className="text-right">任务分配</TableHead>
                      <TableHead className="text-right">完成数</TableHead>
                      <TableHead className="text-right">完成率</TableHead>
                      <TableHead className="text-right">平均分</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell>
                          <div className="font-medium">{dept.name}</div>
                          {dept.description && (
                            <div className="text-sm text-gray-500">{dept.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{dept.userCount}</TableCell>
                        <TableCell className="text-right">{dept.assignmentCount}</TableCell>
                        <TableCell className="text-right">{dept.completedCount}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={dept.completionRate >= 80 ? "default" : dept.completionRate >= 50 ? "secondary" : "destructive"}>
                            {dept.completionRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {dept.averageScore !== null ? `${dept.averageScore}分` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  个人学习明细
                </CardTitle>
                <CardDescription>查看每个用户的学习进度和测验成绩</CardDescription>
              </div>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="全部部门" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部部门</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">加载中...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead className="text-right">任务</TableHead>
                      <TableHead className="text-right">完成</TableHead>
                      <TableHead className="text-right">完成率</TableHead>
                      <TableHead className="text-right">平均分</TableHead>
                      <TableHead className="text-right">通过测验</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </TableCell>
                        <TableCell>{user.department || "-"}</TableCell>
                        <TableCell className="text-right">{user.totalTasks}</TableCell>
                        <TableCell className="text-right">{user.completedTasks}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={user.completionRate >= 80 ? "default" : user.completionRate >= 50 ? "secondary" : "destructive"}>
                            {user.completionRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {user.averageScore !== null ? `${user.averageScore}分` : "-"}
                        </TableCell>
                        <TableCell className="text-right">{user.passedQuizzes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                任务统计
              </CardTitle>
              <CardDescription>查看每个任务的学习情况和测验通过率</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">加载中...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>任务名称</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">分配数</TableHead>
                      <TableHead className="text-right">完成数</TableHead>
                      <TableHead className="text-right">完成率</TableHead>
                      <TableHead className="text-right">平均分</TableHead>
                      <TableHead className="text-right">通过率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="font-medium">{task.title}</div>
                          {task.deadline && (
                            <div className="text-sm text-gray-500">
                              截止: {new Date(task.deadline).toLocaleDateString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              task.status === "completed"
                                ? "default"
                                : task.status === "in_progress"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {task.status === "completed"
                              ? "已完成"
                              : task.status === "in_progress"
                              ? "进行中"
                              : "未开始"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{task.assignmentCount}</TableCell>
                        <TableCell className="text-right">{task.completedCount}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              task.completionRate >= 80
                                ? "default"
                                : task.completionRate >= 50
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {task.completionRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {task.averageScore !== null ? `${task.averageScore}分` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {task.passRate !== null ? `${task.passRate}%` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
