"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, CheckCircle, FileText } from "lucide-react";
import Link from "next/link";

interface LearnerTask {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: "pending" | "in_progress" | "completed";
  file_count: number;
  progress: number;
}

const mockTasks: LearnerTask[] = [
  {
    id: "1",
    title: "新员工入职培训",
    description: "帮助新员工快速了解公司文化和工作流程",
    deadline: "2024-02-10",
    status: "in_progress",
    file_count: 5,
    progress: 40,
  },
  {
    id: "2",
    title: "安全规范学习",
    description: "学习公司安全规范和相关制度",
    deadline: "2024-02-15",
    status: "pending",
    file_count: 3,
    progress: 0,
  },
  {
    id: "3",
    title: "产品知识培训",
    description: "深入了解公司产品线和核心功能",
    deadline: "2024-02-20",
    status: "pending",
    file_count: 8,
    progress: 0,
  },
  {
    id: "4",
    title: "2023年度总结报告",
    description: "公司2023年度工作总结",
    deadline: "2024-01-05",
    status: "completed",
    file_count: 2,
    progress: 100,
  },
];

export default function LearnerDashboard() {
  const pendingTasks = mockTasks.filter((t) => t.status === "pending");
  const inProgressTasks = mockTasks.filter((t) => t.status === "in_progress");
  const completedTasks = mockTasks.filter((t) => t.status === "completed");

  const stats = [
    {
      title: "待学习任务",
      value: pendingTasks.length + inProgressTasks.length,
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "已完成任务",
      value: completedTasks.length,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "即将到期",
      value: 2,
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">我的学习</h1>
        <p className="text-muted-foreground">查看和管理您的学习任务</p>
      </div>

      {/* 欢迎卡片 */}
      <Card className="bg-primary text-primary-foreground border-0">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">欢迎回来，张三！</h2>
              <p className="mt-1 opacity-90">
                您有 {pendingTasks.length + inProgressTasks.length} 个学习任务待完成
              </p>
            </div>
            <div className="hidden sm:block">
              <BookOpen className="w-16 h-16 opacity-20" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="transition-shadow hover:shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1 text-foreground">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 进行中的任务 */}
      {inProgressTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              进行中的任务
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inProgressTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border rounded-lg bg-card transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">
                          {task.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 mt-3">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <FileText className="w-4 h-4" />
                            {task.file_count} 个文件
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            截止: {task.deadline}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="w-full sm:w-32">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>进度</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                      <Link href={`/tasks/${task.id}/learn`}>
                        <Button size="sm">继续学习</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 待开始的任务 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            待开始的任务
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingTasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                暂无待学习的任务
              </p>
            ) : (
              pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border rounded-lg bg-card transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">
                          {task.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 mt-3">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <FileText className="w-4 h-4" />
                            {task.file_count} 个文件
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            截止: {task.deadline}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-4 shrink-0">
                        未开始
                      </Badge>
                    </div>
                    <div className="flex justify-end">
                      <Link href={`/tasks/${task.id}/learn`}>
                        <Button size="sm" variant="outline">
                          开始学习
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 已完成的任务 */}
      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              已完成的任务
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {task.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                        已完成 - 得分：85 分
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 shrink-0">
                      完成
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
