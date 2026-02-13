"use client";

import { useState } from "react";
import { TasksTable } from "./TasksTable";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function TasksPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
          <p className="text-gray-500 mt-1">管理学习任务和文件</p>
        </div>
        <CreateTaskDialog />
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索任务..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 任务表格 */}
      <TasksTable searchQuery={searchQuery} />
    </div>
  );
}
