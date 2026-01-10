/**
 * Avatar and profile picture constants
 */

// 1 MB file size limit
export const MAX_AVATAR_FILE_SIZE = 1048576; // 1 MB in bytes
export const MAX_AVATAR_FILE_SIZE_MB = 1;

// Allowed MIME types for avatars
export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * Format file size for display (e.g., "2.5 MB", "500 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if file size exceeds limit
 */
export function isFileSizeExceeded(fileSize: number): boolean {
  return fileSize > MAX_AVATAR_FILE_SIZE;
}

/**
 * Get error message for oversized file
 */
export function getFileSizeErrorMessage(fileSize: number): string {
  const actualSize = formatFileSize(fileSize);
  const maxSize = formatFileSize(MAX_AVATAR_FILE_SIZE);
  return `File size (${actualSize}) exceeds maximum allowed size (${maxSize})`;
}
