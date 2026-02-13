"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, FileText, Video, File, Clock, CheckCircle, Play, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface TaskFile {
  id: string;
  taskId: string;
  title: string;
  fileUrl: string;
  originalUrl: string | null;
  fileType: 'pdf' | 'video' | 'office';
  fileSize: number;
  duration: number | null;
  order: number;
  converted: boolean;
}

interface LearningProgress {
  id: string;
  userId: string;
  taskId: string;
  fileId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
}

interface TaskDetail {
  task: {
    id: string;
    title: string;
    description: string | null;
    deadline: string | null;
    passingScore: number;
    createdAt: string;
  };
  files: TaskFile[];
  assignment: {
    id: string;
    taskId: string;
    userId: string;
    assignedAt: string;
    completedAt: string | null;
  } | null;
  progress: LearningProgress[];
}

interface ApiResponse {
  success: boolean;
  data: TaskDetail;
  error?: string;
}

// Demo data for when API is not available
const demoTaskData: Record<string, TaskDetail> = {
  '1': {
    task: {
      id: '1',
      title: '新员工入职培训',
      description: '帮助新员工快速了解公司文化和工作流程',
      deadline: '2024-02-10',
      passingScore: 60,
      createdAt: '2024-01-01',
    },
    files: [
      { id: 'f1', taskId: '1', title: '公司介绍.pdf', fileUrl: '/files/intro.pdf', originalUrl: null, fileType: 'pdf' as const, fileSize: 1024000, duration: null, order: 1, converted: true },
      { id: 'f2', taskId: '1', title: '安全规范视频.mp4', fileUrl: '/files/safety.mp4', originalUrl: null, fileType: 'video' as const, fileSize: 50000000, duration: 600, order: 2, converted: true },
      { id: 'f3', taskId: '1', title: '工作流程.pdf', fileUrl: '/files/workflow.pdf', originalUrl: null, fileType: 'pdf' as const, fileSize: 2048000, duration: null, order: 3, converted: true },
      { id: 'f4', taskId: '1', title: '办公软件使用指南.docx', fileUrl: '/files/office-guide.docx', originalUrl: null, fileType: 'office' as const, fileSize: 512000, duration: null, order: 4, converted: true },
      { id: 'f5', taskId: '1', title: '公司制度手册.pdf', fileUrl: '/files/policy.pdf', originalUrl: null, fileType: 'pdf' as const, fileSize: 1536000, duration: null, order: 5, converted: true },
    ],
    assignment: { id: 'a1', taskId: '1', userId: 'demo-user', assignedAt: '2024-01-05', completedAt: null },
    progress: [
      { id: 'p1', userId: 'demo-user', taskId: '1', fileId: 'f1', status: 'completed' as const, progress: 100, startedAt: '2024-01-05', completedAt: '2024-01-05' },
      { id: 'p2', userId: 'demo-user', taskId: '1', fileId: 'f2', status: 'in_progress' as const, progress: 60, startedAt: '2024-01-06', completedAt: null },
      { id: 'p3', userId: 'demo-user', taskId: '1', fileId: 'f3', status: 'in_progress' as const, progress: 20, startedAt: '2024-01-07', completedAt: null },
      { id: 'p4', userId: 'demo-user', taskId: '1', fileId: 'f4', status: 'not_started' as const, progress: 0, startedAt: null, completedAt: null },
      { id: 'p5', userId: 'demo-user', taskId: '1', fileId: 'f5', status: 'not_started' as const, progress: 0, startedAt: null, completedAt: null },
    ],
  },
  '2': {
    task: {
      id: '2',
      title: '安全规范学习',
      description: '学习公司安全规范和相关制度',
      deadline: '2024-02-15',
      passingScore: 80,
      createdAt: '2024-01-10',
    },
    files: [
      { id: 'f6', taskId: '2', title: '安全生产手册.pdf', fileUrl: '/files/safety-handbook.pdf', originalUrl: null, fileType: 'pdf' as const, fileSize: 2560000, duration: null, order: 1, converted: true },
      { id: 'f7', taskId: '2', title: '消防知识视频.mp4', fileUrl: '/files/fire-safety.mp4', originalUrl: null, fileType: 'video' as const, fileSize: 80000000, duration: 1200, order: 2, converted: true },
      { id: 'f8', taskId: '2', title: '应急预案.docx', fileUrl: '/files/emergency-plan.docx', originalUrl: null, fileType: 'office' as const, fileSize: 384000, duration: null, order: 3, converted: true },
    ],
    assignment: { id: 'a2', taskId: '2', userId: 'demo-user', assignedAt: '2024-01-12', completedAt: null },
    progress: [
      { id: 'p6', userId: 'demo-user', taskId: '2', fileId: 'f6', status: 'not_started' as const, progress: 0, startedAt: null, completedAt: null },
      { id: 'p7', userId: 'demo-user', taskId: '2', fileId: 'f7', status: 'not_started' as const, progress: 0, startedAt: null, completedAt: null },
      { id: 'p8', userId: 'demo-user', taskId: '2', fileId: 'f8', status: 'not_started' as const, progress: 0, startedAt: null, completedAt: null },
    ],
  },
  '3': {
    task: {
      id: '3',
      title: '产品知识培训',
      description: '深入了解公司产品线和核心功能',
      deadline: '2024-02-20',
      passingScore: 70,
      createdAt: '2024-01-15',
    },
    files: [
      { id: 'f9', taskId: '3', title: '产品介绍.pdf', fileUrl: '/files/product-intro.pdf', originalUrl: null, fileType: 'pdf' as const, fileSize: 5120000, duration: null, order: 1, converted: true },
      { id: 'f10', taskId: '3', title: '功能演示视频.mp4', fileUrl: '/files/demo.mp4', originalUrl: null, fileType: 'video' as const, fileSize: 150000000, duration: 2400, order: 2, converted: true },
    ],
    assignment: { id: 'a3', taskId: '3', userId: 'demo-user', assignedAt: '2024-01-18', completedAt: null },
    progress: [
      { id: 'p9', userId: 'demo-user', taskId: '3', fileId: 'f9', status: 'not_started' as const, progress: 0, startedAt: null, completedAt: null },
      { id: 'p10', userId: 'demo-user', taskId: '3', fileId: 'f10', status: 'not_started' as const, progress: 0, startedAt: null, completedAt: null },
    ],
  },
};

export default function LearnTaskPage() {
  const params = useParams();
  const taskId = params.id as string;
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<TaskFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/${taskId}/learn`);
      const data: ApiResponse = await res.json();

      if (data.success) {
        setTaskDetail(data.data);
        // Select first not-completed file or first file
        const firstIncomplete = data.data.files.find(f => {
          const prog = data.data.progress.find(p => p.fileId === f.id);
          return prog?.status !== 'completed';
        });
        setSelectedFile(firstIncomplete || data.data.files[0] || null);
      } else {
        // Use demo data when API fails
        const demoData = demoTaskData[taskId];
        if (demoData) {
          setTaskDetail(demoData);
          const firstIncomplete = demoData.files.find(f => {
            const prog = demoData.progress.find(p => p.fileId === f.id);
            return prog?.status !== 'completed';
          });
          setSelectedFile(firstIncomplete || demoData.files[0] || null);
        } else {
          setError(data.error || '任务不存在');
        }
      }
    } catch (err) {
      // Use demo data when API is not available
      const demoData = demoTaskData[taskId];
      if (demoData) {
        setTaskDetail(demoData);
        const firstIncomplete = demoData.files.find(f => {
          const prog = demoData.progress.find(p => p.fileId === f.id);
          return prog?.status !== 'completed';
        });
        setSelectedFile(firstIncomplete || demoData.files[0] || null);
      } else {
        setError('获取任务详情失败');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetail();
    }
  }, [taskId, fetchTaskDetail]);

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
      case 'office':
        return <FileText className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const getFileProgress = (fileId: string) => {
    return taskDetail?.progress.find(p => p.fileId === fileId);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateOverallProgress = () => {
    if (!taskDetail?.files.length) return 0;
    const totalProgress = taskDetail.files.reduce((sum, file) => {
      const prog = getFileProgress(file.id);
      return sum + (prog?.progress || 0);
    }, 0);
    return Math.round(totalProgress / taskDetail.files.length);
  };

  const handleStartLearning = async (file: TaskFile) => {
    try {
      await fetch('/api/learning/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          action: 'open',
        }),
      });
      setSelectedFile(file);
    } catch (err) {
      console.error('Failed to start learning:', err);
    }
  };

  const handleFinishFile = async (file: TaskFile) => {
    try {
      await fetch('/api/learning/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          action: 'finish',
        }),
      });
      // Refresh task detail
      fetchTaskDetail();
    } catch (err) {
      console.error('Failed to finish file:', err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !taskDetail) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">{error || '任务不存在'}</p>
              <Link href="/">
                <Button>返回首页</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{taskDetail.task.title}</h1>
          {taskDetail.task.description && (
            <p className="text-muted-foreground mt-1">{taskDetail.task.description}</p>
          )}
        </div>
        {taskDetail.task.deadline && (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            截止: {new Date(taskDetail.task.deadline).toLocaleDateString()}
          </Badge>
        )}
      </div>

      {/* Overall Progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="font-medium">学习进度</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {calculateOverallProgress()}%
            </span>
          </div>
          <Progress value={calculateOverallProgress()} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* File List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">学习资料</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {taskDetail.files.map((file) => {
                  const prog = getFileProgress(file.id);
                  const isSelected = selectedFile?.id === file.id;
                  const isCompleted = prog?.status === 'completed';

                  return (
                    <button
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full p-4 text-left transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border-l-2 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            getFileIcon(file.fileType)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{file.title}</span>
                            {isCompleted && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                已完成
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{formatFileSize(file.fileSize)}</span>
                            {file.duration && (
                              <span>{formatDuration(file.duration)}</span>
                            )}
                          </div>
                          {prog && !isCompleted && (
                            <Progress value={prog.progress} className="h-1 mt-2" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* File Viewer */}
        <div className="lg:col-span-2">
          {selectedFile ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getFileIcon(selectedFile.fileType)}
                    {selectedFile.title}
                  </CardTitle>
                  <div className="flex gap-2">
                    {getFileProgress(selectedFile.id)?.status !== 'completed' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartLearning(selectedFile)}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          开始学习
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleFinishFile(selectedFile)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          完成
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* File Preview */}
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                  {selectedFile.fileType === 'pdf' && (
                    <div className="text-center">
                      <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">PDF 文件预览</p>
                      <p className="text-sm text-muted-foreground">{selectedFile.title}</p>
                    </div>
                  )}
                  {selectedFile.fileType === 'video' && (
                    <div className="text-center">
                      <Video className="w-16 h-16 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">视频播放器</p>
                      {selectedFile.duration && (
                        <p className="text-sm text-muted-foreground">
                          时长: {formatDuration(selectedFile.duration)}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedFile.fileType === 'office' && (
                    <div className="text-center">
                      <File className="w-16 h-16 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Office 文档预览</p>
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="grid gap-4 sm:grid-cols-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">文件大小</span>
                    <p className="font-medium">{formatFileSize(selectedFile.fileSize)}</p>
                  </div>
                  {selectedFile.duration && (
                    <div>
                      <span className="text-muted-foreground">时长</span>
                      <p className="font-medium">{formatDuration(selectedFile.duration)}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">学习状态</span>
                    <p className="font-medium">
                      {getFileProgress(selectedFile.id)?.status === 'completed'
                        ? '已完成'
                        : getFileProgress(selectedFile.id)?.status === 'in_progress'
                        ? '学习中'
                        : '未开始'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">选择一个学习资料开始</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
