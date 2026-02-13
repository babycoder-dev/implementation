"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Upload, X } from "lucide-react";

export function CreateTaskDialog() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 提交逻辑
    setOpen(false);
    setFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          创建任务
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建学习任务</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">任务标题</Label>
            <Input
              id="title"
              placeholder="请输入任务标题"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">任务描述</Label>
            <Textarea
              id="description"
              placeholder="请输入任务描述（可选）"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">截止时间</Label>
            <Input
              id="deadline"
              type="date"
              required
            />
          </div>

          {/* 必学人员选择 */}
          <div className="space-y-2">
            <Label>必学人员</Label>
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-500">暂无可选人员，请先创建用户</p>
            </div>
          </div>

          {/* 文件上传 */}
          <div className="space-y-2">
            <Label>学习文件</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                id="file-upload"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  点击或拖拽文件到此处上传
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  支持 PDF、Office 文档、视频文件
                </span>
              </label>
            </div>

            {/* 已上传文件列表 */}
            {files.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label>已上传文件</Label>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 测试题设置 */}
          <div className="space-y-2">
            <Label>测试题设置</Label>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">
                任务创建后可添加测试题
              </p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">需要测试</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">及格分数：</span>
                  <Input
                    type="number"
                    className="w-20"
                    placeholder="60"
                    min="0"
                    max="100"
                    defaultValue={60}
                  />
                  <span className="text-sm">分</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit">创建任务</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
