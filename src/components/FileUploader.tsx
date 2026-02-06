"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, X, File, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export interface UploadedFile {
  name: string
  url: string
  path: string
  size: number
}

interface FileUploaderProps {
  onFilesChange: (files: UploadedFile[]) => void
  accept?: string
  maxSize?: number
  maxFiles?: number
  prefix?: string
  className?: string
}

export function FileUploader({
  onFilesChange,
  accept = "*/*",
  maxSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 5,
  prefix = "tasks",
  className,
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return

      if (files.length + selectedFiles.length > maxFiles) {
        setError(`最多只能上传 ${maxFiles} 个文件`)
        return
      }

      setError(null)
      setUploading(true)

      const newProgress: Record<string, number> = {}
      const uploadedFiles: UploadedFile[] = []

      for (const file of Array.from(selectedFiles)) {
        if (file.size > maxSize) {
          setError(`文件 "${file.name}" 大小超过限制 (${Math.round(maxSize / 1024 / 1024)}MB)`)
          continue
        }

        const fileId = `${Date.now()}-${file.name}`
        newProgress[fileId] = 0

        try {
          const formData = new FormData()
          formData.append("file", file)
          formData.append("prefix", prefix)
          formData.append("filename", file.name)

          // 模拟上传进度
          setUploadProgress((prev) => ({ ...prev, [fileId]: 30 }))

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          })

          const data = await res.json()

          if (data.success) {
            setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))
            uploadedFiles.push({
              name: file.name,
              url: data.url,
              path: data.path,
              size: data.size,
            })
          } else {
            setError(data.error || `上传 "${file.name}" 失败`)
          }
        } catch {
          setError(`上传 "${file.name}" 失败，请重试`)
        }
      }

      const updatedFiles = [...files, ...uploadedFiles]
      setFiles(updatedFiles)
      onFilesChange(updatedFiles)

      setUploadProgress((prev) => {
        const filtered = { ...prev }
        Object.keys(newProgress).forEach((key) => delete filtered[key])
        return filtered
      })
      setUploading(false)

      // 清空 input 以便可以再次选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [files, maxSize, maxFiles, prefix, onFilesChange]
  )

  const handleRemoveFile = useCallback(
    (index: number) => {
      const updatedFiles = files.filter((_, i) => i !== index)
      setFiles(updatedFiles)
      onFilesChange(updatedFiles)
    },
    [files, onFilesChange]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 拖拽上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          "border-gray-300 hover:border-primary-500 hover:bg-gray-50",
          uploading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={uploading}
        />
        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          拖拽文件到此处，或 <span className="text-primary-500 font-medium">点击选择文件</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          最多 {maxFiles} 个文件，每个不超过 {Math.round(maxSize / 1024 / 1024)}MB
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
      )}

      {/* 上传进度 */}
      {uploading && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">正在上传...</p>
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="space-y-1">
              <Progress value={progress} />
            </div>
          ))}
        </div>
      )}

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">已上传的文件</p>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(index)}
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
