'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Video, Play, Pause, Download, AlertTriangle, VolumeX, Volume2, Zap } from 'lucide-react'

interface TaskFile {
  id: string
  title: string
  fileUrl: string
  fileType: string
  fileSize: number
  order: number
}

interface VideoPlayerProps {
  file: TaskFile
  onProgressUpdate: (fileId: string, currentTime: number, duration: number) => void
  onActionLog: (
    fileId: string,
    action: 'play' | 'pause' | 'seek' | 'finish' | 'muted' | 'speed_changed',
    currentTime: number,
    metadata?: Record<string, unknown>
  ) => void
}

interface AnomalyFlags {
  mutedPlayback: boolean
  highSpeedPlayback: boolean
  excessivePauses: boolean
}

const MUTE_DURATION_THRESHOLD = 2 // seconds to flag muted playback
const HIGH_SPEED_THRESHOLD = 1.5
const PAUSE_LIMIT_THRESHOLD = 10 // Max pauses before flagging

export function VideoPlayer({ file, onProgressUpdate, onActionLog }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [anomalies, setAnomalies] = useState<AnomalyFlags>({
    mutedPlayback: false,
    highSpeedPlayback: false,
    excessivePauses: false,
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const pauseCountRef = useRef(0)
  const lastMuteCheckRef = useRef<number>(0)
  const isFirstPlayRef = useRef(true)

  // Sync mute state from video element
  const handleVolumeChange = useCallback(() => {
    if (videoRef.current) {
      setIsMuted(videoRef.current.muted)
    }
  }, [])

  // Reset anomalies when file changes
  useEffect(() => {
    setAnomalies({
      mutedPlayback: false,
      highSpeedPlayback: false,
      excessivePauses: false,
    })
    pauseCountRef.current = 0
    lastMuteCheckRef.current = 0
    isFirstPlayRef.current = true
  }, [file.id])

  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget
    const time = Math.floor(video.currentTime)
    const dur = video.duration

    setCurrentTime(time)
    setDuration(dur)

    // Record progress every 5 seconds
    if (time > 0 && time % 5 === 0) {
      onProgressUpdate(file.id, time, Math.floor(dur))
    }

    // Check for muted playback during play
    if (isMuted && isPlaying && time > lastMuteCheckRef.current + MUTE_DURATION_THRESHOLD) {
      setAnomalies((prev) => ({ ...prev, mutedPlayback: true }))
      onActionLog(file.id, 'muted', time, { duration: MUTE_DURATION_THRESHOLD })
      lastMuteCheckRef.current = time
    }
  }, [file.id, isMuted, isPlaying, onProgressUpdate, onActionLog])

  const handlePlay = useCallback(() => {
    setIsPlaying(true)

    // Check muted on first play
    if (isFirstPlayRef.current && isMuted) {
      setAnomalies((prev) => ({ ...prev, mutedPlayback: true }))
      onActionLog(file.id, 'muted', 0, { isInitialPlay: true })
      isFirstPlayRef.current = false
    }

    onActionLog(file.id, 'play', Math.floor(currentTime))
  }, [file.id, currentTime, isMuted, onActionLog])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
    pauseCountRef.current += 1

    if (pauseCountRef.current >= PAUSE_LIMIT_THRESHOLD) {
      setAnomalies((prev) => ({ ...prev, excessivePauses: true }))
    }

    onActionLog(file.id, 'pause', Math.floor(currentTime), {
      pauseCount: pauseCountRef.current,
      isExcessive: pauseCountRef.current >= PAUSE_LIMIT_THRESHOLD,
    })
  }, [file.id, currentTime, onActionLog])

  const handleSeeked = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const time = Math.floor(e.currentTarget.currentTime)
    setCurrentTime(time)
    onActionLog(file.id, 'seek', time)
  }, [file.id, onActionLog])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    onActionLog(file.id, 'finish', Math.floor(duration))
  }, [file.id, duration, onActionLog])

  const handleRateChange = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const rate = e.currentTarget.playbackRate
    setPlaybackRate(rate)

    if (rate >= HIGH_SPEED_THRESHOLD) {
      setAnomalies((prev) => ({ ...prev, highSpeedPlayback: true }))
    }

    onActionLog(file.id, 'speed_changed', Math.floor(currentTime), {
      playbackRate: rate,
      isHighSpeed: rate >= HIGH_SPEED_THRESHOLD,
    })
  }, [file.id, currentTime, onActionLog])

  // Note: Mute state is tracked via video's muted property automatically
  // We don't need a separate handler since HTML5 video controls handle mute toggling

  const anomalyCount = Object.values(anomalies).filter(Boolean).length

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            {file.title}
          </span>
          {anomalyCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" />
              {anomalyCount} 项异常
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Video Player */}
          <div className="relative bg-slate-900 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={file.fileUrl}
              className="w-full aspect-video"
              onTimeUpdate={handleTimeUpdate}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeeked={handleSeeked}
              onEnded={handleEnded}
              onRateChange={handleRateChange}
              onVolumeChange={handleVolumeChange}
              controls
            />
          </div>

          {/* Anomaly Warnings */}
          {anomalyCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium text-sm">检测到可疑行为</span>
              </div>
              <ul className="space-y-1 text-sm">
                {anomalies.mutedPlayback && (
                  <li className="flex items-center gap-2 text-amber-600">
                    <VolumeX className="h-3 w-3" />
                    静音播放（可能试图绕过学习）
                  </li>
                )}
                {anomalies.highSpeedPlayback && (
                  <li className="flex items-center gap-2 text-amber-600">
                    <Zap className="h-3 w-3" />
                    倍速播放（{playbackRate.toFixed(1)}x，超过 {HIGH_SPEED_THRESHOLD}x）
                  </li>
                )}
                {anomalies.excessivePauses && (
                  <li className="flex items-center gap-2 text-amber-600">
                    <Pause className="h-3 w-3" />
                    暂停次数过多（{pauseCountRef.current} 次）
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Progress Bar */}
          <Progress
            value={duration > 0 ? (currentTime / duration) * 100 : 0}
            className="h-2"
          />

          {/* Time and Status */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isPlaying ? (
                  <Play className="h-4 w-4 text-green-500" />
                ) : (
                  <Pause className="h-4 w-4 text-slate-500" />
                )}
                <span className="text-slate-600">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Speed Indicator */}
              <Badge
                variant={playbackRate > 1 ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                {playbackRate > 1 ? (
                  <Zap className="h-3 w-3" />
                ) : (
                  <span>1</span>
                )}
                x
              </Badge>

              {/* Mute Indicator */}
              <Badge
                variant={isMuted ? 'destructive' : 'secondary'}
                className="flex items-center gap-1"
              >
                {isMuted ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
                {isMuted ? '静音' : '声音'}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={isPlaying ? 'default' : 'secondary'}>
                {isPlaying ? '播放中' : '已暂停'}
              </Badge>
              {pauseCountRef.current > 0 && (
                <span className="text-xs text-slate-500">
                  暂停 {pauseCountRef.current} 次
                </span>
              )}
            </div>
          </div>

          {/* Download Link */}
          <a
            href={file.fileUrl}
            download
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <Download className="h-4 w-4" />
            下载视频
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
