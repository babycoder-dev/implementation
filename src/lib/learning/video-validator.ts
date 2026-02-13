import { database } from '@/lib/db';

// Video validation rules constants
const VIDEO_VALIDATION_RULES = {
  MIN_WATCHED_RATIO: 0.8, // 80% of video must be watched
  MAX_PAUSE_COUNT: 3, // Less than 3 pauses allowed
  MAX_ALLOWED_SPEED: 1.5, // Max speed allowed (1.5x)
} as const;

export interface VideoValidationResult {
  watchedMinutes: number;
  totalMinutes: number;
  pauseCount: number;
  maxSpeed: number;
  isValid: boolean;
  details: {
    watchedRatio: number;
    meetsWatchedRequirement: boolean;
    meetsPauseRequirement: boolean;
    meetsSpeedRequirement: boolean;
  };
}

export interface VideoFileInfo {
  id: string;
  duration: number; // in seconds
}

export interface VideoLogEntry {
  id: string;
  user_id: string;
  file_id: string;
  timestamp: Date;
  action: string; // 'pause', 'speed_changed', 'play', 'finish'
  current_time: number;
  playback_speed?: number; // for speed_changed events
}

export class VideoLearningValidator {
  private db = database;

  /**
   * Validate video learning completion for a user
   * Validates based on rules from section 7.2:
   * - Watched duration >= 80% of total video duration
   * - Pause count < 3 times
   * - Max playback speed <= 1.5x
   */
  async validate(userId: string, videoId: string): Promise<VideoValidationResult> {
    // Get video file info
    const videoInfo = await this.getVideoInfo(videoId);
    if (!videoInfo) {
      throw new Error(`Video not found: ${videoId}`);
    }

    // Get all video logs for this user and video
    const logs = await this.getVideoLogs(userId, videoId);

    // Calculate validation metrics
    const watchedMinutes = this.calculateWatchedMinutes(logs, videoInfo.duration);
    const pauseCount = this.countPauses(logs);
    const maxSpeed = this.calculateMaxSpeed(logs);

    const watchedRatio = videoInfo.duration > 0 ? watchedMinutes / videoInfo.duration : 0;

    // Check each requirement
    const meetsWatchedRequirement = watchedRatio >= VIDEO_VALIDATION_RULES.MIN_WATCHED_RATIO;
    const meetsPauseRequirement = pauseCount < VIDEO_VALIDATION_RULES.MAX_PAUSE_COUNT;
    const meetsSpeedRequirement = maxSpeed <= VIDEO_VALIDATION_RULES.MAX_ALLOWED_SPEED;

    const isValid = meetsWatchedRequirement && meetsPauseRequirement && meetsSpeedRequirement;

    return {
      watchedMinutes: Math.round(watchedMinutes * 100) / 100,
      totalMinutes: videoInfo.duration,
      pauseCount,
      maxSpeed: Math.round(maxSpeed * 100) / 100,
      isValid,
      details: {
        watchedRatio: Math.round(watchedRatio * 10000) / 10000,
        meetsWatchedRequirement,
        meetsPauseRequirement,
        meetsSpeedRequirement,
      },
    };
  }

  /**
   * Get video file information including duration
   */
  private async getVideoInfo(videoId: string): Promise<VideoFileInfo | null> {
    try {
      const result = await this.db`
        SELECT id, file_size as duration
        FROM task_files
        WHERE id = ${videoId} AND file_type = 'video'
      ` as { id: string; duration: number }[];

      if (result.length === 0) {
        return null;
      }

      // file_size is stored in bytes, we need to convert to seconds
      // For video files, we might have duration stored separately or need to calculate
      // This is a placeholder - in production, you might have a dedicated duration column
      return {
        id: result[0].id,
        duration: result[0].duration || 600, // Default 10 minutes if not set
      };
    } catch (error) {
      console.error('Error getting video info:', error);
      return null;
    }
  }

  /**
   * Get all video logs for a user and video
   */
  private async getVideoLogs(userId: string, videoId: string): Promise<VideoLogEntry[]> {
    try {
      const result = await this.db`
        SELECT id, user_id, file_id, timestamp, action, current_time, playback_speed
        FROM video_logs
        WHERE user_id = ${userId} AND file_id = ${videoId}
        ORDER BY timestamp ASC
      ` as {
        id: string;
        user_id: string;
        file_id: string;
        timestamp: Date;
        action: string;
        current_time: number;
        playback_speed?: number;
      }[];

      return result.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        file_id: row.file_id,
        timestamp: new Date(row.timestamp),
        action: row.action,
        current_time: row.current_time,
        playback_speed: row.playback_speed,
      }));
    } catch (error) {
      console.error('Error getting video logs:', error);
      return [];
    }
  }

  /**
   * Calculate total watched minutes from logs
   * Estimates watched time by tracking play segments
   */
  private calculateWatchedMinutes(logs: VideoLogEntry[], totalDuration: number): number {
    if (logs.length === 0) {
      return 0;
    }

    // Track play time segments
    let totalWatched = 0;
    let lastPlayTime: number | null = null;

    for (const log of logs) {
      switch (log.action) {
        case 'play':
          // User started playing - track from current position
          lastPlayTime = log.current_time;
          break;

        case 'pause':
          // User paused - calculate time watched since last play
          if (lastPlayTime !== null) {
            const segmentWatched = log.current_time - lastPlayTime;
            totalWatched += Math.max(0, segmentWatched);
          }
          lastPlayTime = null;
          break;

        case 'seek':
        case 'time_update':
          // Time update or seek - update play position
          if (lastPlayTime !== null) {
            const segmentWatched = log.current_time - lastPlayTime;
            totalWatched += Math.max(0, segmentWatched);
          }
          lastPlayTime = log.current_time;
          break;

        case 'finish':
          // Video finished - calculate remaining time
          if (lastPlayTime !== null) {
            const segmentWatched = log.current_time - lastPlayTime;
            totalWatched += Math.max(0, segmentWatched);
          }
          // Add remaining time to end
          totalWatched += totalDuration - log.current_time;
          break;
      }
    }

    // Handle case where video is still playing (no finish event)
    if (lastPlayTime !== null && logs.length > 0) {
      const lastLog = logs[logs.length - 1];
      const segmentWatched = lastLog.current_time - lastPlayTime;
      totalWatched += Math.max(0, segmentWatched);
    }

    // Cap at total duration
    return Math.min(totalWatched, totalDuration);
  }

  /**
   * Count number of pause events from logs
   */
  private countPauses(logs: VideoLogEntry[]): number {
    return logs.filter((log) => log.action === 'pause').length;
  }

  /**
   * Calculate maximum playback speed used from logs
   */
  private calculateMaxSpeed(logs: VideoLogEntry[]): number {
    let maxSpeed = 1.0; // Default normal speed

    for (const log of logs) {
      if (log.action === 'speed_changed' && log.playback_speed !== undefined) {
        if (log.playback_speed > maxSpeed) {
          maxSpeed = log.playback_speed;
        }
      }
    }

    return maxSpeed;
  }

  /**
   * Validate multiple videos for a user
   */
  async validateMultiple(userId: string, videoIds: string[]): Promise<Map<string, VideoValidationResult>> {
    const results = new Map<string, VideoValidationResult>();

    await Promise.all(
      videoIds.map(async (videoId) => {
        try {
          const result = await this.validate(userId, videoId);
          results.set(videoId, result);
        } catch (error) {
          console.error(`Error validating video ${videoId}:`, error);
        }
      })
    );

    return results;
  }

  /**
   * Check if all videos in a list are valid
   */
  async validateAll(userId: string, videoIds: string[]): Promise<boolean> {
    const results = await this.validateMultiple(userId, videoIds);

    for (const videoId of videoIds) {
      const result = results.get(videoId);
      if (!result || !result.isValid) {
        return false;
      }
    }

    return true;
  }
}

export const videoValidator = new VideoLearningValidator();
