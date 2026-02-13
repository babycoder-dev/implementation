import { useState, useEffect, useCallback, useRef } from 'react'

export type VisibilityState = 'visible' | 'hidden' | 'prerender'

export interface UsePageVisibilityOptions {
  /** 页面隐藏时上报的 API 端点 */
  reportEndpoint?: string
  /** 上报时附加的额外数据 */
  extraData?: Record<string, unknown>
  /** 是否启用自动上报（默认 true） */
  autoReport?: boolean
  /** 禁用时是否仍然跟踪状态 */
  trackOnly?: boolean
}

export interface UsePageVisibilityReturn {
  /** 当前页面可见性状态 */
  isHidden: boolean
  /** 当前 visibilityState 值 */
  visibilityState: VisibilityState
  /** 可见性变化时的回调 */
  onVisibilityChange: (callback: (isHidden: boolean) => void) => () => void
  /** 手动触发上报（仅在 trackOnly 为 false 时可用） */
  report: () => Promise<void>
}

/**
 * 页面可见性检测 Hook
 * 监听 document.visibilityState，页面失焦/隐藏时自动上报
 */
export function usePageVisibility(
  options: UsePageVisibilityOptions = {}
): UsePageVisibilityReturn {
  const {
    reportEndpoint,
    extraData = {},
    autoReport = true,
    trackOnly = false,
  } = options

  const [isHidden, setIsHidden] = useState(false)
  const [visibilityState, setVisibilityState] = useState<VisibilityState>('visible')
  const callbacksRef = useRef<Set<(isHidden: boolean) => void>>(new Set())
  const previousVisibilityRef = useRef<VisibilityState>('visible')

  // 上报函数
  const report = useCallback(async () => {
    if (trackOnly || !reportEndpoint) {
      return
    }

    try {
      const payload = {
        ...extraData,
        visibilityState: visibilityState,
        timestamp: new Date().toISOString(),
        previousState: previousVisibilityRef.current,
      }

      await fetch(reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      console.error('Failed to report visibility change:', error)
    }
  }, [reportEndpoint, extraData, visibilityState, trackOnly])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const handleVisibilityChange = () => {
      const newState = document.visibilityState as VisibilityState
      const hidden = newState !== 'visible'

      // 更新状态（遵循 immutability 原则，创建新对象）
      setVisibilityState(newState)
      setIsHidden(hidden)
      previousVisibilityRef.current = newState

      // 触发所有注册的回调
      callbacksRef.current.forEach((callback) => {
        try {
          callback(hidden)
        } catch (error) {
          console.error('Visibility callback error:', error)
        }
      })

      // 页面隐藏时自动上报
      if (hidden && autoReport && !trackOnly) {
        report()
      }
    }

    // 初始化状态
    const initialState = document.visibilityState as VisibilityState
    setVisibilityState(initialState)
    setIsHidden(initialState !== 'visible')
    previousVisibilityRef.current = initialState

    // 绑定事件监听器
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 清理函数
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [autoReport, report, trackOnly])

  // 注册回调函数
  const onVisibilityChange = useCallback((callback: (isHidden: boolean) => void) => {
    callbacksRef.current.add(callback)

    // 返回取消注册的函数
    return () => {
      callbacksRef.current.delete(callback)
    }
  }, [])

  return {
    isHidden,
    visibilityState,
    onVisibilityChange,
    report,
  }
}

/**
 * 纯函数：检查页面是否隐藏
 * 可用于非 React 场景
 */
export function checkPageVisibility(): boolean {
  if (typeof document === 'undefined') {
    return false
  }
  return document.visibilityState !== 'visible'
}

/**
 * 纯函数：获取当前 visibilityState
 */
export function getVisibilityState(): VisibilityState {
  if (typeof document === 'undefined') {
    return 'visible'
  }
  return document.visibilityState as VisibilityState
}
