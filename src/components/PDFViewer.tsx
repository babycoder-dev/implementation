'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { usePageVisibility } from '@/lib/learning/visibility-detector'
import { cn } from '@/lib/utils'

export interface PDFViewerProps {
  /** PDF 文件 URL */
  src: string
  /** 文件 ID，用于上报 */
  fileId: string
  /** 用户 ID，用于上报 */
  userId?: string
  /** 初始页码 */
  initialPage?: number
  /** 类名 */
  className?: string
  /** 页面隐藏时上报的 API 端点 */
  reportEndpoint?: string
  /** 自定义样式 */
  style?: React.CSSProperties
  /** 加载完成回调 */
  onLoad?: () => void
  /** 页面变化回调 */
  onPageChange?: (page: number) => void
  /** 学习日志上报端点 */
  logEndpoint?: string
}

/**
 * PDF 查看器组件
 * 集成页面可见性检测，页面隐藏时暂停计时并上报
 */
export function PDFViewer({
  src,
  fileId,
  userId,
  initialPage = 1,
  className,
  reportEndpoint,
  style,
  onLoad,
  onPageChange,
  logEndpoint,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  // 集成页面可见性检测
  const { isHidden, onVisibilityChange, report } = usePageVisibility({
    reportEndpoint: reportEndpoint || '/api/learning/pdf-visibility',
    extraData: {
      fileId,
      userId,
      currentPage,
    },
    autoReport: true,
  })

  // 上报学习日志到服务器
  const reportLearningLog = useCallback(
    async (action: string, extraData?: Record<string, unknown>) => {
      if (!logEndpoint) return

      try {
        await fetch(logEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId,
            action,
            pageNum: currentPage,
            isHidden,
            ...extraData,
          }),
        })
      } catch (err) {
        console.error('Failed to report learning log:', err)
      }
    },
    [fileId, currentPage, isHidden, logEndpoint]
  )

  // 页面隐藏时上报学习时间
  useEffect(() => {
    if (isHidden) {
      const endTime = Date.now()
      const duration = Math.floor((endTime - startTimeRef.current) / 1000)

      // 上报隐藏时的学习状态
      report().finally(() => {
        // 重置计时器
        startTimeRef.current = Date.now()
      })

      // 上报可疑行为（页面隐藏）
      reportLearningLog('stay', {
        duration,
        isHidden: true,
      })

      // 通知父组件页面隐藏
      console.log(`PDF hidden: fileId=${fileId}, page=${currentPage}, duration=${duration}s`)
    }
  }, [isHidden, fileId, currentPage, report, reportLearningLog])

  // 注册可见性变化回调
  useEffect(() => {
    const unsubscribe = onVisibilityChange((hidden) => {
      if (!hidden) {
        // 页面恢复可见时重置计时器
        startTimeRef.current = Date.now()
      }
    })

    return unsubscribe
  }, [onVisibilityChange])

  // 模拟 PDF 加载（实际项目中可使用 pdf.js）
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 模拟 PDF 加载
        await new Promise((resolve) => setTimeout(resolve, 500))

        // 设置总页数（模拟）
        setTotalPages(10)
        setIsLoading(false)

        onLoad?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
        setIsLoading(false)
      }
    }

    loadPDF()
  }, [src, onLoad])

  // 处理页面变化
  const handlePageChange = useCallback(
    (newPage: number) => {
      const validPage = Math.max(1, Math.min(newPage, totalPages))
      setCurrentPage(validPage)
      onPageChange?.(validPage)

      // 上报页面切换日志
      reportLearningLog('page_turn', {
        previousPage: currentPage,
        newPage: validPage,
      })
    },
    [totalPages, onPageChange, currentPage, reportLearningLog]
  )

  // 页面隐藏时暂停计时逻辑
  useEffect(() => {
    if (isHidden) {
      // 页面隐藏时暂停 PDF 相关计时
      console.log('PDF viewer paused due to page hidden')
    }
  }, [isHidden])

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 rounded-lg',
          className
        )}
        style={style}
      >
        <div className="text-center text-red-500">
          <p>Failed to load PDF</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col bg-white rounded-lg shadow-sm border',
        className
      )}
      style={style}
    >
      {/* PDF 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
        <div className="text-xs text-gray-500">
          {isHidden ? (
            <span className="text-yellow-600">已暂停</span>
          ) : (
            <span className="text-green-600">学习中</span>
          )}
        </div>
      </div>

      {/* PDF 内容区域 */}
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-gray-500">加载中...</p>
          </div>
        ) : (
          <div className="text-center">
            {/* PDF 渲染占位符 - 实际项目中使用 pdf.js */}
            <div className="w-[600px] h-[800px] bg-gray-200 flex items-center justify-center rounded">
              <p className="text-gray-500">
                PDF: {src}
                <br />
                Page: {currentPage}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 状态指示器 */}
      {isHidden && (
        <div className="absolute inset-0 bg-yellow-50/80 flex items-center justify-center">
          <div className="bg-white px-4 py-2 rounded-lg shadow text-yellow-700">
            页面已隐藏，学习计时已暂停
          </div>
        </div>
      )}
    </div>
  )
}
