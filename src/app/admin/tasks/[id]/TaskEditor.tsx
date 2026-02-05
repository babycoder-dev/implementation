'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Save,
  Upload,
  Trash2,
  X,
  Plus,
  Users,
  FileText,
  Check,
  ChevronDown,
} from 'lucide-react'
import Link from 'next/link'

// Types
interface TaskFile {
  id: string
  name: string
  size: number
  uploadedAt: string
}

interface AssignedUser {
  id: string
  name: string
  username: string
}

interface QuizQuestion {
  id: string
  question: string
  type: 'single' | 'multiple' | 'truefalse'
  options: string[]
  correctAnswer: string | string[]
}

interface Task {
  id: string
  title: string
  description: string | null
  deadline: string | null
  status: string
  files?: TaskFile[]
  assignedUsers?: AssignedUser[]
  quizQuestions?: QuizQuestion[]
}

interface User {
  id: string
  name: string
  username: string
}

export default function TaskEditor({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<Task | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('basic')

  // File upload state
  const [files, setFiles] = useState<TaskFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // User assignment state
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null)

  // New question form state
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    type: 'single' as 'single' | 'multiple' | 'truefalse',
    options: ['', '', '', ''],
    correctAnswer: '',
    correctAnswers: [] as string[],
  })

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then(res => res.json())
      .then(data => {
        const taskData = data.data
        setTask(taskData)
        setFiles(taskData.files || [])
        setAssignedUsers(taskData.assignedUsers || [])
        setQuizQuestions(taskData.quizQuestions || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data.data || []))
      .catch(() => {})
  }, [taskId])

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const res = await fetch(`/api/tasks/${taskId}/files`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        setFiles([...files, data.data])
        setSelectedFile(null)
      }
    } catch {
      console.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/files/${fileId}`, {
        method: 'DELETE',
      })
      setFiles(files.filter(f => f.id !== fileId))
    } catch {
      console.error('Delete failed')
    }
  }

  // User assignment handlers
  const handleAssignUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] }),
      })
      const data = await res.json()

      if (data.success) {
        const userToAdd = users.find(u => u.id === userId)
        if (userToAdd && !assignedUsers.find(u => u.id === userId)) {
          setAssignedUsers([...assignedUsers, { id: userToAdd.id, name: userToAdd.name, username: userToAdd.username }])
        }
      }
    } catch {
      console.error('Assignment failed')
    }
    setShowUserDropdown(false)
  }

  const handleRemoveUser = async (userId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/assignments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] }),
      })
      setAssignedUsers(assignedUsers.filter(u => u.id !== userId))
    } catch {
      console.error('Remove assignment failed')
    }
  }

  // Quiz handlers
  const handleAddQuestion = () => {
    setEditingQuestion(null)
    setNewQuestion({
      question: '',
      type: 'single',
      options: ['', '', '', ''],
      correctAnswer: '',
      correctAnswers: [],
    })
    setShowQuizModal(true)
  }

  const handleEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion(question)
    setNewQuestion({
      question: question.question,
      type: question.type,
      options: question.options.length > 0 ? [...question.options, '', '', '', ''].slice(0, 4) : ['', '', '', ''],
      correctAnswer: typeof question.correctAnswer === 'string' ? question.correctAnswer : '',
      correctAnswers: Array.isArray(question.correctAnswer) ? question.correctAnswer : [],
    })
    setShowQuizModal(true)
  }

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/quiz/${questionId}`, {
        method: 'DELETE',
      })
      setQuizQuestions(quizQuestions.filter(q => q.id !== questionId))
    } catch {
      console.error('Delete question failed')
    }
  }

  const handleSaveQuestion = async () => {
    try {
      const payload = {
        question: newQuestion.question,
        type: newQuestion.type,
        options: newQuestion.options.filter(o => o.trim()),
        correctAnswer: newQuestion.type === 'multiple' ? newQuestion.correctAnswers : newQuestion.correctAnswer,
      }

      const url = editingQuestion
        ? `/api/tasks/${taskId}/quiz/${editingQuestion.id}`
        : `/api/tasks/${taskId}/quiz`

      const res = await fetch(url, {
        method: editingQuestion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        if (editingQuestion) {
          setQuizQuestions(quizQuestions.map(q => (q.id === editingQuestion.id ? { ...q, ...payload } : q)))
        } else {
          setQuizQuestions([...quizQuestions, data.data])
        }
        setShowQuizModal(false)
      }
    } catch {
      console.error('Save question failed')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task?.title,
          description: task?.description,
          deadline: task?.deadline,
        }),
      })
    } catch {
      console.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) return <div className="p-4">加载中...</div>
  if (!task) return <div className="p-4">任务不存在</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/tasks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />返回
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">编辑任务</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('basic')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'basic'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          基本信息
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'files'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          附件管理
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          任务分配
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'quiz'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          测验管理
        </button>
      </div>

      {/* Basic Info Tab */}
      {activeTab === 'basic' && (
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">标题</label>
              <Input
                value={task.title}
                onChange={e => setTask({ ...task, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <Textarea
                value={task.description || ''}
                onChange={e => setTask({ ...task, description: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">截止时间</label>
              <Input
                type="datetime-local"
                value={task.deadline ? task.deadline.slice(0, 16) : ''}
                onChange={e => setTask({ ...task, deadline: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">状态</label>
              <div className="mt-1 text-sm text-gray-600">
                {task.status === 'active' ? '进行中' : task.status === 'completed' ? '已完成' : task.status}
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* File Upload Tab */}
      {activeTab === 'files' && (
        <Card>
          <CardHeader>
            <CardTitle>附件管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Area */}
            <div className="flex items-center gap-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                />
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    选择文件
                  </span>
                </Button>
              </label>
              {selectedFile && (
                <span className="text-sm text-gray-600">
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </span>
              )}
              {selectedFile && (
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? '上传中...' : '上传'}
                </Button>
              )}
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">已上传文件</h3>
                <div className="border rounded-lg divide-y">
                  {files.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            {formatFileSize(file.size)} | 上传于{' '}
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {files.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                暂无附件，点击上传按钮添加文件
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Assignment Tab */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle>任务分配</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add User Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                <Plus className="w-4 h-4 mr-2" />
                添加用户
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>

              {showUserDropdown && (
                <div className="absolute z-10 mt-1 w-64 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {users
                    .filter(u => !assignedUsers.find(au => au.id === u.id))
                    .map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleAssignUser(user.id)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                      >
                        {user.name} ({user.username})
                      </button>
                    ))}
                  {users.filter(u => !assignedUsers.find(au => au.id === u.id)).length ===
                    0 && (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      没有可分配的用户
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assigned Users List */}
            {assignedUsers.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">已分配用户</h3>
                <div className="border rounded-lg divide-y">
                  {assignedUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">{user.name}</div>
                          <div className="text-xs text-gray-500">@{user.username}</div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(user.id)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assignedUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                暂无分配用户，点击添加按钮分配任务
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quiz Management Tab */}
      {activeTab === 'quiz' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>测验管理</CardTitle>
            <Button onClick={handleAddQuestion}>
              <Plus className="w-4 h-4 mr-2" />
              添加题目
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Questions List */}
            {quizQuestions.length > 0 && (
              <div className="space-y-4">
                {quizQuestions.map((q, index) => (
                  <div key={q.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded">
                          {q.type === 'single'
                            ? '单选题'
                            : q.type === 'multiple'
                            ? '多选题'
                            : '判断题'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {index + 1}.
                        </span>
                        <span className="text-sm font-medium">{q.question}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditQuestion(q)}>
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuestion(q.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    {q.options.length > 0 && (
                      <div className="ml-8 space-y-1">
                        {q.options.map((opt, optIndex) => (
                          <div
                            key={optIndex}
                            className={`text-sm px-2 py-1 rounded ${
                              Array.isArray(q.correctAnswer)
                                ? q.correctAnswer.includes(opt)
                                  ? 'bg-green-100 text-green-700'
                                  : ''
                                : q.correctAnswer === opt
                                ? 'bg-green-100 text-green-700'
                                : ''
                            }`}
                          >
                            {String.fromCharCode(65 + optIndex)}. {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {quizQuestions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                暂无测验题目，点击添加按钮创建
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quiz Question Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingQuestion ? '编辑题目' : '添加新题目'}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowQuizModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Question Content */}
            <div>
              <label className="text-sm font-medium">题目内容</label>
              <Textarea
                value={newQuestion.question}
                onChange={e =>
                  setNewQuestion({ ...newQuestion, question: e.target.value })
                }
                placeholder="请输入题目内容"
                className="mt-1"
              />
            </div>

            {/* Question Type */}
            <div>
              <label className="text-sm font-medium">题目类型</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="questionType"
                    checked={newQuestion.type === 'single'}
                    onChange={() =>
                      setNewQuestion({
                        ...newQuestion,
                        type: 'single',
                        correctAnswer: '',
                        correctAnswers: [],
                      })
                    }
                  />
                  <span className="text-sm">单选题</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="questionType"
                    checked={newQuestion.type === 'multiple'}
                    onChange={() =>
                      setNewQuestion({
                        ...newQuestion,
                        type: 'multiple',
                        correctAnswer: '',
                        correctAnswers: [],
                      })
                    }
                  />
                  <span className="text-sm">多选题</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="questionType"
                    checked={newQuestion.type === 'truefalse'}
                    onChange={() =>
                      setNewQuestion({
                        ...newQuestion,
                        type: 'truefalse',
                        options: ['正确', '错误'],
                        correctAnswer: '正确',
                        correctAnswers: [],
                      })
                    }
                  />
                  <span className="text-sm">判断题</span>
                </label>
              </div>
            </div>

            {/* Options (for single/multiple choice) */}
            {newQuestion.type !== 'truefalse' && (
              <div>
                <label className="text-sm font-medium">选项</label>
                <div className="space-y-2 mt-1">
                  {newQuestion.options.map((opt, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm w-6">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <Input
                        value={opt}
                        onChange={e => {
                          const newOptions = [...newQuestion.options]
                          newOptions[index] = e.target.value
                          setNewQuestion({ ...newQuestion, options: newOptions })
                        }}
                        placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Correct Answer */}
            <div>
              <label className="text-sm font-medium">正确答案</label>
              {newQuestion.type === 'single' && (
                <select
                  value={newQuestion.correctAnswer}
                  onChange={e =>
                    setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })
                  }
                  className="mt-1 w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">请选择正确答案</option>
                  {newQuestion.options
                    .filter(o => o.trim())
                    .map((opt, index) => (
                      <option key={index} value={opt}>
                        {String.fromCharCode(65 + index)}. {opt}
                      </option>
                    ))}
                </select>
              )}
              {newQuestion.type === 'multiple' && (
                <div className="space-y-2 mt-1">
                  {newQuestion.options
                    .filter(o => o.trim())
                    .map((opt, index) => (
                      <label
                        key={index}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newQuestion.correctAnswers.includes(opt)}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewQuestion({
                                ...newQuestion,
                                correctAnswers: [...newQuestion.correctAnswers, opt],
                              })
                            } else {
                              setNewQuestion({
                                ...newQuestion,
                                correctAnswers: newQuestion.correctAnswers.filter(
                                  a => a !== opt
                                ),
                              })
                            }
                          }}
                        />
                        <span className="text-sm">
                          {String.fromCharCode(65 + index)}. {opt}
                        </span>
                      </label>
                    ))}
                </div>
              )}
              {newQuestion.type === 'truefalse' && (
                <select
                  value={newQuestion.correctAnswer}
                  onChange={e =>
                    setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })
                  }
                  className="mt-1 w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="正确">正确</option>
                  <option value="错误">错误</option>
                </select>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowQuizModal(false)}>
                取消
              </Button>
              <Button onClick={handleSaveQuestion}>
                <Check className="w-4 h-4 mr-2" />
                保存题目
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
