"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Video, BookOpen, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface TaskFile {
  id: string;
  taskId: string;
  title: string;
  fileUrl: string;
  fileType: 'pdf' | 'video' | 'office';
  fileSize: number;
  duration: number | null;
  order: number;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  passingScore: number;
  passing_score: number;
  createdAt: string;
  createdByName?: string;
  files: TaskFile[];
  questions: { id: string }[];
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTask() {
      try {
        const response = await fetch(`/api/tasks/${taskId}`);
        const data = await response.json();

        if (data.success) {
          setTask(data.data);
        } else {
          setError(data.error || '获取任务详情失败');
        }
      } catch (err) {
        setError('加载任务详情时出错');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2" />
              <p>{error || '任务不存在'}</p>
              <Button variant="link" onClick={() => router.back()} className="mt-4">
                返回
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
      case 'office':
        return <FileText className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tasks">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">任务详情</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Task Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>{task.title}</CardTitle>
            <CardDescription>
              创建于 {new Date(task.createdAt).toLocaleDateString('zh-CN')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.description && (
              <div>
                <h3 className="font-medium mb-1">任务描述</h3>
                <p className="text-gray-600 text-sm">{task.description}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Badge variant={task.status === 'pending' ? 'default' : 'secondary'}>
                {task.status === 'pending' ? '待完成' : task.status}
              </Badge>
              <Badge variant="outline">
                及格分数: {task.passingScore || task.passing_score}分
              </Badge>
            </div>

            {task.deadline && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                截止日期: {new Date(task.deadline).toLocaleDateString('zh-CN')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Learning & Quiz Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>学习与测验</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Button asChild className="w-full">
                <Link href={`/tasks/${taskId}/learn`}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  开始学习
                </Link>
              </Button>

              {task.questions && task.questions.length > 0 && (
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/tasks/${taskId}/quiz`}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    开始测验 ({task.questions.length}题)
                  </Link>
                </Button>
              )}
            </div>

            <div className="text-sm text-gray-500">
              <p>学习完成后请进行测验，测验及格后任务完成。</p>
            </div>
          </CardContent>
        </Card>

        {/* Files Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>学习资料 ({task.files?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {task.files && task.files.length > 0 ? (
              <div className="space-y-2">
                {task.files.map((file, index) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.fileType)}
                      <div>
                        <p className="font-medium">{file.title}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.fileSize)}
                          {file.duration && ` · ${formatDuration(file.duration)}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      #{index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">暂无学习资料</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
