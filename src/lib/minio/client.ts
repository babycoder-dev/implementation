/**
 * MinIO/S3 Client Library
 * Provides file upload, download, and management operations
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ============ Configuration ============

const s3Config = {
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  region: process.env.MINIO_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
  },
  forcePathStyle: true, // Required for MinIO
};

// ============ S3 Client ============

const s3Client = new S3Client(s3Config);

export { s3Client };

// ============ Bucket Names ============

export const BUCKET_NAMES = {
  ORIGINAL: process.env.MINIO_BUCKET_ORIGINAL || 'learning-original',
  CONVERTED: process.env.MINIO_BUCKET_CONVERTED || 'learning-converted',
  VIDEOS: process.env.MINIO_BUCKET_VIDEOS || 'learning-videos',
  TEMP: process.env.MINIO_BUCKET_TEMP || 'learning-temp',
} as const;

export type BucketName = (typeof BUCKET_NAMES)[keyof typeof BUCKET_NAMES];

// ============ File Types ============

export type FileType = 'pdf' | 'video' | 'office';

// ============ File Info ============

export interface UploadedFileInfo {
  key: string;
  bucket: BucketName;
  url: string;
  size: number;
  contentType: string;
  originalName: string;
}

// ============ Upload Functions ============

/**
 * Upload a file to S3/MinIO
 */
export async function uploadFile(
  bucket: BucketName,
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<UploadedFileInfo> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  });

  await s3Client.send(command);

  return {
    key,
    bucket,
    url: getFileUrl(bucket, key),
    size: Buffer.isBuffer(body) ? body.length : 0,
    contentType,
    originalName: metadata?.originalName || key,
  };
}

/**
 * Upload a file with presigned URL (for direct browser upload)
 */
export async function getUploadPresignedUrl(
  bucket: BucketName,
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<{ uploadUrl: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return { uploadUrl, key };
}

// ============ Download Functions ============

/**
 * Get a presigned URL for downloading a file
 */
export async function getDownloadPresignedUrl(
  bucket: BucketName,
  key: string,
  expiresIn: number = 3600,
  filename?: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: filename
      ? `attachment; filename="${filename}"`
      : undefined,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Get a file as buffer
 */
export async function getFile(
  bucket: BucketName,
  key: string
): Promise<{ body: Buffer; contentType: string; size: number }> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);

  const body = await streamToBuffer(response.Body as NodeJS.ReadableStream);

  return {
    body,
    contentType: response.ContentType || 'application/octet-stream',
    size: response.ContentLength || body.length,
  };
}

// ============ Delete Functions ============

/**
 * Delete a file
 */
export async function deleteFile(bucket: BucketName, key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Delete multiple files
 */
export async function deleteFiles(
  bucket: BucketName,
  keys: string[]
): Promise<void> {
  await Promise.all(keys.map((key) => deleteFile(bucket, key)));
}

// ============ Query Functions ============

/**
 * List files in a bucket/prefix
 */
export async function listFiles(
  bucket: BucketName,
  prefix?: string,
  maxKeys: number = 1000
): Promise<
  Array<{
    key: string;
    size: number;
    lastModified: Date;
  }>
> {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await s3Client.send(command);

  return (response.Contents || []).map((item) => ({
    key: item.Key || '',
    size: item.Size || 0,
    lastModified: item.LastModified || new Date(),
  }));
}

/**
 * Check if a file exists
 */
export async function fileExists(
  bucket: BucketName,
  key: string
): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(
  bucket: BucketName,
  key: string
): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
  metadata: Record<string, string>;
} | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata || {},
    };
  } catch {
    return null;
  }
}

// ============ Copy Functions ============

/**
 * Copy a file within S3
 */
export async function copyFile(
  sourceBucket: BucketName,
  sourceKey: string,
  destBucket: BucketName,
  destKey: string
): Promise<void> {
  const command = new CopyObjectCommand({
    Bucket: destBucket,
    CopySource: `${sourceBucket}/${sourceKey}`,
    Key: destKey,
  });

  await s3Client.send(command);
}

// ============ URL Helpers ============

/**
 * Get file URL (public URL for accessible files)
 */
export function getFileUrl(bucket: BucketName, key: string): string {
  const endpoint = s3Config.endpoint;
  return `${endpoint}/${bucket}/${key}`;
}

/**
 * Generate a unique file key for a task
 */
export function generateFileKey(
  taskId: string,
  fileId: string,
  fileName: string,
  fileType: FileType
): string {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

  switch (fileType) {
    case 'pdf':
      return `pdf/${taskId}/${fileId}_${sanitizedName}`;
    case 'video':
      return `videos/${taskId}/${fileId}_${sanitizedName}`;
    case 'office':
      return `office/${taskId}/${fileId}_${sanitizedName}`;
    default:
      return `files/${taskId}/${fileId}_${sanitizedName}`;
  }
}

// ============ Utility Functions ============

/**
 * Convert stream to buffer
 */
async function streamToBuffer(
  stream: NodeJS.ReadableStream
): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

/**
 * Get bucket for file type
 */
export function getBucketForFileType(fileType: FileType): BucketName {
  switch (fileType) {
    case 'pdf':
      return BUCKET_NAMES.ORIGINAL;
    case 'video':
      return BUCKET_NAMES.VIDEOS;
    case 'office':
      return BUCKET_NAMES.ORIGINAL;
    default:
      return BUCKET_NAMES.ORIGINAL;
  }
}

/**
 * Get bucket for converted file
 */
export function getConvertedBucket(): BucketName {
  return BUCKET_NAMES.CONVERTED;
}
