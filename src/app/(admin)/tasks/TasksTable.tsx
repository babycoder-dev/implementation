"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye, FileText } from "lucide-react";
import { formatDate, getStatusColor, getStatusText } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  created_by_name: string | null;
  created_at: string;
  file_count: number;
  completed_count: number;
}

// 模拟数据
const mockTasks: Task[] = [
  {
    id: "1",
    title: "新员工入职培训",
    description: "帮助新员工快速了解公司文化和工作流程",
    deadline: "2024-02-10",
    status: "in_progress",
    created_by_name: "管理员",
    created_at: "2024-01-15",
    file_count: 5,
    completed_count: 3,
  },
  {
    id: "2",
    title: "安全规范学习",
    description: "学习公司安全规范和相关制度",
    deadline: "2024-02-15",
    status: "pending",
    created_by_name: "管理员",
    created_at: "2024-01-20",
    file_count: 3,
    completed_count: 0,
  },
  {
    id: "3",
    title: "产品知识培训",
    description: "深入了解公司产品线和核心功能",
    deadline: "2024-02-20",
    status: "pending",
    created_by_name: "王五",
    created_at: "2024-01-25",
    file_count: 8,
    completed_count: 0,
  },
  {
    id: "4",
    title: "2023年度总结报告",
    description: "公司2023年度工作总结",
    deadline: "2024-01-05",
    status: "completed",
    created_by_name: "管理员",
    created_at: "2024-01-01",
    file_count: 2,
    completed_count: 156,
  },
];

interface TasksTableProps {
  searchQuery: string;
}

export function TasksTable({ searchQuery }: TasksTableProps) {
  const filteredTasks = mockTasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description &&
        task.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>任务标题</TableHead>
            <TableHead>截止时间</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>文件数</TableHead>
            <TableHead>完成情况</TableHead>
            <TableHead>创建人</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead className="w-[100px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-gray-500 truncate max-w-xs">
                      {task.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>{formatDate(task.deadline)}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(task.status)}>
                  {getStatusText(task.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span>{task.file_count}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width:
                          task.status === "completed"
                            ? "100%"
                            : `${(task.completed_count / 50) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">
                    {task.completed_count}/50
                  </span>
                </div>
              </TableCell>
              <TableCell>{task.created_by_name}</TableCell>
              <TableCell>{formatDate(task.created_at)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="w-4 h-4 mr-2" />
                      查看详情
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filteredTasks.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          暂无任务数据
        </div>
      )}
    </div>
  );
}
