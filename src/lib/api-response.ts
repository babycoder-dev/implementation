import { NextResponse } from 'next/server';

/**
 * 统一 API 响应类型
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    message?: string;
  };
  timestamp: string;
}

/**
 * 创建成功响应
 */
export function successResponse<T>(
  data: T,
  meta?: ApiResponse<T>['meta'],
  status?: number
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
  }, { status: status ?? 200 });
}

/**
 * 创建错误响应
 */
export function errorResponse(
  message: string,
  status: number = 400,
  meta?: ApiResponse['meta']
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      meta,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * 创建分页响应
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * HTTP 状态码常量
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * 错误码常量
 */
export const ErrorCode = {
  // 通用错误 (1xxx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // 认证错误 (2xxx)
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_DISABLED: 'USER_DISABLED',

  // 任务错误 (3xxx)
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  TASK_EXPIRED: 'TASK_EXPIRED',
  TASK_ALREADY_COMPLETED: 'TASK_ALREADY_COMPLETED',

  // 文件错误 (4xxx)
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_TYPE_INVALID: 'FILE_TYPE_INVALID',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',

  // 测验错误 (5xxx)
  QUIZ_NOT_FOUND: 'QUIZ_NOT_FOUND',
  QUIZ_ALREADY_SUBMITTED: 'QUIZ_ALREADY_SUBMITTED',
  QUIZ_NOT_STARTED: 'QUIZ_NOT_STARTED',
} as const;
