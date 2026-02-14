import { sql } from '@/lib/db';
import { PdfLearningLog } from '../types';

// Validation result interface
export interface PdfValidationResult {
  isOpened: boolean;
  durationMinutes: number;
  reachedLastPage: boolean;
  isValid: boolean;
}

interface FilePageInfo {
  id: string;
  total_pages: number;
}

interface PageTurnLog {
  page_num: number;
  timestamp: Date | string;
}

interface CountResult {
  count: string;
}

interface MaxPageResult {
  max_page: number | null;
}

interface TimestampResult {
  timestamp: Date | string;
}

/**
 * PDF Learning Validator
 * Validates if a user has completed effective learning of a PDF file
 *
 * Validation rules (design doc 7.2):
 * 1. File must be opened (isOpened)
 * 2. Duration >= 5 minutes (durationMinutes >= 5)
 * 3. Must reach the last page (reachedLastPage)
 * All conditions must be true for isValid: true
 */
export class PdfLearningValidator {
  private readonly MIN_DURATION_MINUTES = 5;

  /**
   * Validate PDF learning completion for a user and file
   * @param fileId - The PDF file ID
   * @param userId - The user ID
   * @returns Promise<PdfValidationResult> - Validation results
   */
  async validate(fileId: string, userId: string): Promise<PdfValidationResult> {
    try {
      // 1. Check if file was opened (has at least one learning log)
      const isOpened = await this.checkFileOpened(fileId, userId);

      // 2. Calculate duration in minutes
      const durationMinutes = await this.calculateDuration(fileId, userId);

      // 3. Check if reached last page
      const reachedLastPage = await this.checkReachedLastPage(fileId, userId);

      // 4. Determine overall validity
      const isValid = isOpened && durationMinutes >= this.MIN_DURATION_MINUTES && reachedLastPage;

      return {
        isOpened,
        durationMinutes,
        reachedLastPage,
        isValid,
      };
    } catch (error) {
      console.error('PDF validation error:', error);
      throw new Error('PDF validation failed');
    }
  }

  /**
   * Check if the file was opened by the user
   */
  private async checkFileOpened(fileId: string, userId: string): Promise<boolean> {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM learning_logs
      WHERE user_id = ${userId}
        AND file_id = ${fileId}
        AND action_type = 'open'
    `;

    const countResult = result as unknown as CountResult[];
    return parseInt(countResult[0]?.count || '0') > 0;
  }

  /**
   * Calculate the total learning duration in minutes
   */
  private async calculateDuration(fileId: string, userId: string): Promise<number> {
    // Get all logs for this file and user, ordered by timestamp
    const logs = await sql`
      SELECT timestamp
      FROM learning_logs
      WHERE user_id = ${userId}
        AND file_id = ${fileId}
      ORDER BY timestamp ASC
    ` as TimestampResult[];

    if (logs.length === 0) {
      return 0;
    }

    // Calculate duration from first to last log entry
    const firstTimestamp = new Date(logs[0].timestamp as string).getTime();
    const lastTimestamp = new Date(logs[logs.length - 1].timestamp as string).getTime();

    const durationMs = lastTimestamp - firstTimestamp;
    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    return durationMinutes;
  }

  /**
   * Check if the user reached the last page of the PDF
   */
  private async checkReachedLastPage(fileId: string, userId: string): Promise<boolean> {
    // Get total pages for the file
    const fileInfo = await sql`
      SELECT total_pages
      FROM task_files
      WHERE id = ${fileId}
    ` as FilePageInfo[];

    if (fileInfo.length === 0 || !fileInfo[0]?.total_pages) {
      // If we can't get file info, check if any page logs exist
      const pageLogs = await sql`
        SELECT page_num
        FROM learning_logs
        WHERE user_id = ${userId}
          AND file_id = ${fileId}
          AND action_type IN ('page_turn', 'open')
        ORDER BY timestamp DESC
        LIMIT 1
      ` as PageTurnLog[];

      return pageLogs.length > 0;
    }

    const totalPages = fileInfo[0].total_pages;

    // Get the maximum page number the user has viewed
    const maxPageResult = await sql`
      SELECT MAX(page_num) as max_page
      FROM learning_logs
      WHERE user_id = ${userId}
        AND file_id = ${fileId}
    ` as MaxPageResult[];

    const maxPage = maxPageResult[0]?.max_page || 0;

    // User has reached the last page if their max page >= total pages
    return maxPage >= totalPages;
  }

  /**
   * Get detailed learning progress for debugging/display
   */
  async getLearningProgress(fileId: string, userId: string): Promise<{
    logs: PdfLearningLog[];
    totalPages: number;
    maxPageViewed: number;
    durationMinutes: number;
    firstAccess: Date | null;
    lastAccess: Date | null;
  }> {
    const logs = await sql`
      SELECT *
      FROM learning_logs
      WHERE user_id = ${userId}
        AND file_id = ${fileId}
      ORDER BY timestamp ASC
    ` as PdfLearningLog[];

    const fileInfo = await sql`
      SELECT total_pages
      FROM task_files
      WHERE id = ${fileId}
    ` as FilePageInfo[];

    const maxPageResult = await sql`
      SELECT MAX(page_num) as max_page
      FROM learning_logs
      WHERE user_id = ${userId}
        AND file_id = ${fileId}
    ` as MaxPageResult[];

    const durationMinutes = await this.calculateDuration(fileId, userId);

    return {
      logs,
      totalPages: fileInfo[0]?.total_pages || 0,
      maxPageViewed: maxPageResult[0]?.max_page || 0,
      durationMinutes,
      firstAccess: logs.length > 0 ? new Date(logs[0].timestamp as string | Date) : null,
      lastAccess: logs.length > 0 ? new Date(logs[logs.length - 1].timestamp as string | Date) : null,
    };
  }
}

export const pdfValidator = new PdfLearningValidator();
