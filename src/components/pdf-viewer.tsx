'use client'

import { useEffect, useRef, useState } from 'react'
import { pdfjs } from '@/lib/pdfjs'

interface PDFViewerProps {
  url: string
  onPageChange?: (pageNum: number, totalPages: number) => void
  onFinish?: () => void
}

export function PDFViewer({ url, onPageChange, onFinish }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pageNum, setPageNum] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pdfDoc, setPdfDoc] = useState<any>(null)

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true)
        const loadingTask = pdfjs.getDocument(url)
        const pdf = await loadingTask.promise
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
        renderPage(1)
      } catch (error) {
        console.error('Error loading PDF:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPDF()
  }, [url])

  const renderPage = async (num: number) => {
    if (!pdfDoc || !canvasRef.current) return

    const page = await pdfDoc.getPage(num)
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    const viewport = page.getViewport({ scale: 1.5 })
    canvas.height = viewport.height
    canvas.width = viewport.width

    await page.render({
      canvasContext: context,
      viewport,
    })

    setPageNum(num)
    onPageChange?.(num, totalPages)
  }

  const handlePrev = () => {
    if (pageNum > 1) {
      renderPage(pageNum - 1)
    }
  }

  const handleNext = () => {
    if (pageNum < totalPages) {
      if (pageNum === totalPages - 1) {
        onFinish?.()
      }
      renderPage(pageNum + 1)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={handlePrev}
          disabled={pageNum === 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          上一页
        </button>
        <span className="text-gray-600">
          {pageNum} / {totalPages}
        </span>
        <button
          onClick={handleNext}
          disabled={pageNum === totalPages}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          下一页
        </button>
      </div>

      <canvas ref={canvasRef} className="border shadow-lg" />
    </div>
  )
}
