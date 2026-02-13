import { SuspiciousActivity } from '@/lib/types';

// Detection thresholds
const TIME_GAP_THRESHOLD = 600; // 600 seconds = 10 minutes
const PLAYBACK_SPEED_THRESHOLD = 1.5;

/**
 * Context data for suspicious activity detection
 */
export interface Context {
  /** User ID */
  userId: string;
  /** File ID (optional for some activity types) */
  fileId?: string;
  /** Document visibility state */
  isHidden?: boolean;
  /** Video muted state */
  isMuted?: boolean;
  /** Video playback rate */
  playbackRate?: number;
  /** Time gap between actions in seconds */
  timeGap?: number;
  /** Activity timestamp */
  timestamp?: Date;
  /** Additional evidence data */
  evidence?: Record<string, unknown>;
}

/**
 * Detect suspicious activities based on context data
 * @param context - The context data for detection
 * @returns Array of detected suspicious activities
 */
export function detectSuspiciousActivity(context: Context): SuspiciousActivity[] {
  const activities: SuspiciousActivity[] = [];
  const { userId, fileId, timestamp = new Date() } = context;

  // Detect: Page/document hidden while learning
  if (context.isHidden === true) {
    activities.push({
      id: crypto.randomUUID(),
      user_id: userId,
      file_id: fileId || null,
      activity_type: 'tab_hidden',
      reason: 'Document was hidden while learning',
      evidence: {
        ...context.evidence,
        timestamp: timestamp.toISOString(),
      },
      created_at: timestamp,
    });
  }

  // Detect: Video muted while playing
  if (context.isMuted === true) {
    activities.push({
      id: crypto.randomUUID(),
      user_id: userId,
      file_id: fileId || null,
      activity_type: 'video_muted',
      reason: 'Video was muted during playback',
      evidence: {
        ...context.evidence,
        timestamp: timestamp.toISOString(),
      },
      created_at: timestamp,
    });
  }

  // Detect: Playback speed too fast
  if (context.playbackRate !== undefined && context.playbackRate > PLAYBACK_SPEED_THRESHOLD) {
    activities.push({
      id: crypto.randomUUID(),
      user_id: userId,
      file_id: fileId || null,
      activity_type: 'video_fast_forward',
      reason: `Playback speed (${context.playbackRate}x) exceeds threshold (${PLAYBACK_SPEED_THRESHOLD}x)`,
      evidence: {
        ...context.evidence,
        playbackRate: context.playbackRate,
        threshold: PLAYBACK_SPEED_THRESHOLD,
        timestamp: timestamp.toISOString(),
      },
      created_at: timestamp,
    });
  }

  // Detect: Large time gap between actions
  if (context.timeGap !== undefined && context.timeGap > TIME_GAP_THRESHOLD) {
    activities.push({
      id: crypto.randomUUID(),
      user_id: userId,
      file_id: fileId || null,
      activity_type: 'time_gap_anomaly',
      reason: `Time gap (${context.timeGap}s) exceeds threshold (${TIME_GAP_THRESHOLD}s)`,
      evidence: {
        ...context.evidence,
        timeGap: context.timeGap,
        threshold: TIME_GAP_THRESHOLD,
        timestamp: timestamp.toISOString(),
      },
      created_at: timestamp,
    });
  }

  return activities;
}

/**
 * Check if an activity type is suspicious
 * @param activityType - The activity type to check
 * @returns boolean indicating if the activity is suspicious
 */
export function isSuspiciousActivityType(activityType: string): boolean {
  const suspiciousTypes = [
    'tab_hidden',
    'video_muted',
    'video_fast_forward',
    'time_gap_anomaly',
  ];
  return suspiciousTypes.includes(activityType);
}
