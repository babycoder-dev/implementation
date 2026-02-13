import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  getUploadPresignedUrl,
  getDownloadPresignedUrl,
  generateFileKey,
  getBucketForFileType,
  FileType,
  BucketName,
} from '@/lib/minio/client';

// Configuration
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Supported file types
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.mp4',
  '.webm',
  '.mov',
  '.avi',
];

interface UploadedFile {
  id: string;
  originalName: string;
  fileUrl: string;
  pdfUrl: string | null;
  fileType: 'pdf' | 'video' | 'office';
  fileSize: number;
}

/**
 * Check if file extension is allowed
 */
function isAllowedFile(fileName: string): boolean {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

// GET /api/files/upload - Get upload URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const fileType = searchParams.get('fileType') as FileType | null;
    const taskId = searchParams.get('taskId');

    if (!fileName || !fileType || !taskId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!isAllowedFile(fileName)) {
      return NextResponse.json(
        { success: false, error: 'File type not allowed' },
        { status: 400 }
      );
    }

    const fileId = randomUUID();
    const key = generateFileKey(taskId, fileId, fileName, fileType);
    const contentType = getContentType(fileName);
    const bucket = getBucketForFileType(fileType);

    const { uploadUrl } = await getUploadPresignedUrl(bucket, key, contentType);

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl,
        key,
        fileId,
        bucket,
      },
    });
  } catch (error) {
    console.error('[Upload] Failed to generate upload URL:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

// POST /api/files/upload - Upload file directly or confirm upload
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileType: fileTypeStr, taskId, fileSize, key, bucket } = body;

    if (!fileName || !fileTypeStr || !taskId || !key || !bucket) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const fileType = fileTypeStr as FileType;

    // Validate file
    if (!isAllowedFile(fileName)) {
      return NextResponse.json(
        { success: false, error: 'File type not allowed' },
        { status: 400 }
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds maximum limit (100MB)' },
        { status: 400 }
      );
    }

    // Get download URL for the uploaded file
    const downloadUrl = await getDownloadPresignedUrl(
      bucket as BucketName,
      key,
      3600,
      fileName
    );

    const uploadedFile: UploadedFile = {
      id: key.split('/').pop()?.split('_')[0] || randomUUID(),
      originalName: fileName,
      fileUrl: downloadUrl,
      pdfUrl: null, // Will be set after conversion if needed
      fileType,
      fileSize,
    };

    console.log(`[Upload] File uploaded successfully: ${key}`);

    return NextResponse.json({
      success: true,
      data: uploadedFile,
    });
  } catch (error) {
    console.error('[Upload] File upload failed:', error);
    return NextResponse.json(
      { success: false, error: 'File upload failed' },
      { status: 500 }
    );
  }
}

/**
 * Get content type for file extension
 */
function getContentType(fileName: string): string {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
  };

  return contentTypes[ext] || 'application/octet-stream';
}
