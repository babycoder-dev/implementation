'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { usePageVisibility } from '@/lib/learning/visibility-detector'
import { cn } from '@/lib/utils'

export interface VideoPlayerProps {
  /** 视频文件 URL */
  src: string
  /** 文件 ID，用于上报 */
  fileId: string
  /** 用户 ID，用于上报 */
  userId?: string
  /** 视频标题 */
  title?: string
  /** 初始音量 (0-1) */
  initialVolume?: number
  /** 自动播放 */
  autoPlay?: boolean
  /** 类名 */
  className?: string
  /** 样式 */
  style?: React.CSSProperties
  /** 加载完成回调 */
  onLoad?: () => void
  /** 播放进度回调 */
  onProgress?: (currentTime: number, duration: number) => void
  /** 播放/暂停回调 */
  onPlayPause?: (isPlaying: boolean) => void
  /** 页面隐藏时上报的 API 端点 */
  reportEndpoint?: string
  /** 学习日志上报端点 */
  logEndpoint?: string
}

/**
 * 视频播放器组件
 * 集成页面可见性检测，页面隐藏时自动暂停视频
 */
export function VideoPlayer({
  src,
  fileId,
  userId,
  title,
  initialVolume = 1,
  autoPlay = false,
  className,
  style,
  onLoad,
  onProgress,
  onPlayPause,
  reportEndpoint,
  logEndpoint,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(initialVolume)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playbackRate, setPlaybackRate] = useState(1)
  const lastReportedTimeRef = useRef(0)
  const lastReportTimeRef = useRef<number>(Date.now())

  // 上报学习日志到服务器
  const reportLearningLog = useCallback(
    async (
      action: string,
      extraData?: Record<string, unknown>
    ) => {
      if (!logEndpoint) return

      try {
        const now = Date.now()
        const timeGap = Math.floor((now - lastReportTimeRef.current) / 1000)
        lastReportTimeRef.current = now

        await fetch(logEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId,
            action,
            currentTime,
            duration,
            isMuted,
            playbackRate,
            timeGap,
            ...extraData,
          }),
        })
      } catch (err) {
        console.error('Failed to report learning log:', err)
      }
    },
    [fileId, currentTime, duration, isMuted, playbackRate, logEndpoint]
  )

  // 集成页面可见性检测
  const { isHidden, onVisibilityChange, report } = usePageVisibility({
    reportEndpoint: reportEndpoint || '/api/learning/video-visibility',
    extraData: {
      fileId,
      userId,
      currentTime,
      isPlaying,
      isMuted,
      playbackRate,
    },
    autoReport: true,
  })

  // 页面隐藏时暂停视频
  useEffect(() => {
    if (isHidden && isPlaying && videoRef.current) {
      videoRef.current.pause()
      setIsPlaying(false)
      onPlayPause?.(false)

      // 上报暂停状态
      report().finally(() => {
        console.log(`Video paused due to page hidden: fileId=${fileId}, time=${currentTime}`)
      })

      // 上报可疑行为（页面隐藏）
      reportLearningLog('time_update', {
        isHidden: true,
      })
    }
  }, [isHidden, isPlaying, fileId, currentTime, report, onPlayPause, reportLearningLog])

  // 注册可见性变化回调 - 页面恢复时可选自动恢复播放
  useEffect(() => {
    const unsubscribe = onVisibilityChange((hidden) => {
      if (!hidden && videoRef.current && isPlaying) {
        // 页面恢复可见时，可以选择恢复播放
        // 这里保持暂停状态，让用户决定是否继续
        console.log('Video visibility restored')
      }
    })

    return unsubscribe
  }, [onVisibilityChange, isPlaying])

  // 视频加载完成
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      setIsLoading(false)
      onLoad?.()
    }
  }, [onLoad])

  // 播放时间更新
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime
      setCurrentTime(time)
      onProgress?.(time, duration)

      // 每 5 秒上报一次进度（避免过于频繁）
      if (Math.floor(time) - Math.floor(lastReportedTimeRef.current) >= 5) {
        lastReportedTimeRef.current = time
        // 上报播放进度用于可疑行为检测
        reportLearningLog('time_update', {
          isHidden,
        })
      }
    }
  }, [duration, onProgress, reportLearningLog, isHidden])

  // 播放/暂停
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
      onPlayPause?.(!isPlaying)

      // 上报播放/暂停动作
      reportLearningLog(isPlaying ? 'pause' : 'play')
    }
  }, [isPlaying, onPlayPause, reportLearningLog])

  // 进度跳转
  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value)
      if (videoRef.current) {
        videoRef.current.currentTime = time
        setCurrentTime(time)

        // 上报跳转动作
        reportLearningLog('seek', {
          previousTime: currentTime,
          newTime: time,
        })
      }
    },
    [currentTime, reportLearningLog]
  )

  // 音量控制
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value)
      if (videoRef.current) {
        videoRef.current.volume = vol
        setVolume(vol)
        setIsMuted(vol === 0)
      }
    },
    []
  )

  // 静音切换
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)

      // 上报静音状态变化（可疑行为）
      if (!isMuted) {
        reportLearningLog('play', {
          wasMuted: true,
        })
      }
    }
  }, [isMuted, reportLearningLog])

  // 播放速度切换
  const togglePlaybackRate = useCallback(() => {
    if (videoRef.current) {
      const rates = [0.5, 0.75, 1, 1.25, 1.5, 2]
      const currentIndex = rates.indexOf(playbackRate)
      const nextIndex = (currentIndex + 1) % rates.length
      const newRate = rates[nextIndex]

      videoRef.current.playbackRate = newRate
      setPlaybackRate(newRate)

      // 上报速度变化（可疑行为）
      reportLearningLog('speed_changed', {
        previousRate: playbackRate,
        newRate,
      })
    }
  }, [playbackRate, reportLearningLog])

  // 格式化时间
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // 错误处理
  const handleError = useCallback(() => {
    setError('Failed to load video')
    setIsLoading(false)
  }, [])

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.requestFullscreen()
      }
    }
  }, [])

  // 播放结束
  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    onPlayPause?.(false)
    reportLearningLog('finish')
  }, [onPlayPause, reportLearningLog])

  // 初始化音量
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = initialVolume
    }
  }, [initialVolume])

  // 初始化播放速度
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden',
          className
        )}
        style={style}
      >
        <div className="text-center text-white">
          <p>Failed to load video</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative flex flex-col bg-gray-900 rounded-lg overflow-hidden group',
        className
      )}
      style={style}
    >
      {/* 视频元素 */}
      <video
        ref={videoRef}
        src={src}
        className="w-full aspect-video"
        autoPlay={autoPlay}
        muted={isMuted}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onError={handleError}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
            <p className="text-white text-sm">加载中...</p>
          </div>
        </div>
      )}

      {/* 页面隐藏遮罩 */}
      {isHidden && (
        <div className="absolute inset-0 bg-yellow-500/20 flex items-center justify-center">
          <div className="bg-black/70 px-4 py-2 rounded text-white">
            已暂停 - 页面不可见
          </div>
        </div>
      )}

      {/* 控制栏 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        {/* 标题 */}
        {title && (
          <p className="text-white text-sm mb-2 truncate">{title}</p>
        )}

        {/* 进度条 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white text-xs">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
          />
          <span className="text-white text-xs">{formatTime(duration)}</span>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 播放/暂停按钮 */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-gray-300"
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* 音量控制 */}
            <div className="flex items-center gap-1">
              <button onClick={toggleMute} className="text-white hover:text-gray-300">
                {isMuted || volume === 0 ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>

            {/* 播放速度按钮 */}
            <button
              onClick={togglePlaybackRate}
              className="text-white text-xs px-2 py-1 border border-gray-500 rounded hover:bg-gray-700"
            >
              {playbackRate}x
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* 全屏按钮 */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 状态指示器 */}
      {isHidden && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
          已暂停
        </div>
      )}
      {isMuted && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
          静音
        </div>
      )}
      {playbackRate > 1.5 && (
        <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
          {playbackRate}x
        </div>
      )}
    </div>
  )
}
