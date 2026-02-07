/**
 * URL Resolver for MinIO storage URLs
 *
 * Converts between internal MinIO hostnames (minio:9000) and
 * browser-accessible hostnames (localhost:9000)
 */

const INTERNAL_HOST = 'minio:9000'
const PUBLIC_HOST = 'localhost:9000'

export function getPublicFileUrl(internalUrl: string): string {
  return internalUrl.replace(INTERNAL_HOST, PUBLIC_HOST)
}

export function getInternalFileUrl(publicUrl: string): string {
  return publicUrl.replace(PUBLIC_HOST, INTERNAL_HOST)
}
