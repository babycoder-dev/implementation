'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Eye, Clock } from 'lucide-react'
import { pdfjs } from '@/lib/pdfjs'

interface PDFViewerProps {
  url: string
  fileId: string
  onPageChange?: (fileId: string, pageNum: number, totalPages: number) => void
  onFinish?: (fileId: string) => void
  onTimeUpdate?: (fileId: string, duration: number) => void
}

export function PDFViewer({
  url,
  fileId,
  onPageChange,
  onFinish,
  onTimeUpdate,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageNum, setPageNum] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [studyTime, setStudyTime] = useState(0)
  const [scale, setScale] = useState(1.2)

  const pdfDocRef = useRef<any>(null)
  const startTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastActiveTimeRef = useRef<number>(0)

  // 记录学习时长
  const recordStudyTime = useCallback(
    (seconds: number) => {
      if (seconds > 0) {
        onTimeUpdate?.(fileId, seconds)
        setStudyTime((prev) => prev + seconds)
      }
    },
    [fileId, onTimeUpdate]
  )

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 渲染页面
  const renderPage = useCallback(
    async (num: number) => {
      if (!pdfDocRef.current || !canvasRef.current) return

      try {
        const page = await pdfDocRef.current.getPage(num)
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        if (!context) return

        const viewport = page.getViewport({ scale })
        canvas.height = viewport.height
        canvas.width = viewport.width

        await page.render({
          canvasContext: context,
          viewport,
        })

        setPageNum(num)

        // 记录翻页
        if (num === 1) {
          onPageChange?.(fileId, num, totalPages)
        } else {
          onPageChange?.(fileId, num, totalPages)
        }
      } catch (err) {
        console.error('Error rendering page:', err)
        setError('页面渲染失败')
      }
    },
    [fileId, onPageChange, scale, totalPages]
  )

  // 加载 PDF
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true)
        setError(null)

        const loadingTask = pdfjs.getDocument(url)
        const pdf = await loadingTask.promise
        pdfDocRef.current = pdf
        setTotalPages(pdf.numPages)

        // 首次打开记录
        onPageChange?.(fileId, 1, pdf.numPages)

        await renderPage(1)
      } catch (err) {
        console.error('Error loading PDF:', err)
        setError('加载 PDF 失败，请检查文件路径是否正确')
      } finally {
        setLoading(false)
      }
    }

    loadPDF()
  }, [url, fileId, onPageChange, renderPage])

  // 页面可见性变化处理（失焦/聚焦）
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isPageVisible = !document.hidden
      setIsActive(isPageVisible)

      if (!isPageVisible) {
        // 页面失焦，暂停计时
        if (startTimeRef.current) {
          const now = Date.now()
          const activeSeconds = Math.floor((now - startTimeRef.current) / 1000)
          if (activeSeconds > 0) {
            recordStudyTime(activeSeconds)
          }
          lastActiveTimeRef.current = activeSeconds
          startTimeRef.current = null
        }
      } else {
        // 页面恢复，重新开始计时
        startTimeRef.current = Date.now()
      }
    }

    const handleWindowBlur = () => {
      // 窗口失焦
      if (startTimeRef.current) {
        const now = Date.now()
        const activeSeconds = Math.floor((now - startTimeRef.current) / 1000)
        if (activeSeconds > 0) {
          recordStudyTime(activeSeconds)
        }
        lastActiveTimeRef.current = activeSeconds
        startTimeRef.current = null
      }
      setIsActive(false)
    }

    const handleWindowFocus = () => {
      // 窗口恢复焦点
      startTimeRef.current = Date.now()
      setIsActive(true)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [recordStudyTime])

  // 定时记录学习时长（每60秒）
  useEffect(() => {
    startTimeRef.current = Date.now()

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current && isActive) {
        const now = Date.now()
        const activeSeconds = Math.floor((now - startTimeRef.current) / 1000)

        if (activeSeconds >= 60) {
          recordStudyTime(activeSeconds)
          startTimeRef.current = Date.now()
        }
      }
    }, 60000) // 每60秒检查一次

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      // 组件卸载时记录剩余时间
      if (startTimeRef.current && isActive) {
        const now = Date.now()
        const activeSeconds = Math.floor((now - startTimeRef.current) / 1000)
        if (activeSeconds > 0) {
          recordStudyTime(activeSeconds)
        }
      }
    }
  }, [isActive, recordStudyTime])

  // 上一页
  const handlePrev = () => {
    if (pageNum > 1) {
      renderPage(pageNum - 1)
    }
  }

  // 下一页
  const handleNext = () => {
    if (pageNum < totalPages) {
      renderPage(pageNum + 1)
    }
  }

  // 跳转到指定页
  const handleGoToPage = (targetPage: number) => {
    if (targetPage >= 1 && targetPage <= totalPages) {
      renderPage(targetPage)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-slate-50 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-3" />
        <p className="text-slate-500">加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-red-50 rounded-lg">
        <p className="text-red-500 mb-3">{error}</p>
        <a
          href={url}
          download
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
        >
          下载 PDF
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={pageNum === 1}
            className="p-2 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="上一页"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageNum}
              onChange={(e) => handleGoToPage(parseInt(e.target.value) || 1)}
              className="w-14 px-2 py-1 text-center border rounded focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <span className="text-slate-600">/ {totalPages} 页</span>
          </div>

          <button
            onClick={handleNext}
            disabled={pageNum === totalPages}
            className="p-2 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="下一页"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* 活跃状态 */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
              isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isActive ? (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>学习中</span>
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5" />
                <span>已暂停</span>
              </>
            )}
          </div>

          {/* 学习时长 */}
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <Clock className="h-4 w-4" />
            <span>学习时长: {formatTime(studyTime)}</span>
          </div>
        </div>
      </div>

      {/* PDF 画布 */}
      <div
        ref={containerRef}
        className="flex justify-center bg-slate-100 rounded-lg overflow-auto"
        style={{ minHeight: '500px' }}
      >
        <canvas
          ref={canvasRef}
          className="shadow-lg my-4"
          style={{ maxWidth: '100%' }}
        />
      </div>

      {/* 底部进度条 */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-800 transition-all duration-300"
              style={{ width: `${(pageNum / totalPages) * 100}%` }}
            />
          </div>
        </div>
        <span className="text-sm text-slate-600">
          {Math.round((pageNum / totalPages) * 100)}%
        </span>
      </div>
    </div>
  )
}
