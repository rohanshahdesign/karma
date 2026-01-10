'use client';

import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { supabase } from '@/lib/supabase';
import {
  MAX_AVATAR_FILE_SIZE,
  MAX_AVATAR_FILE_SIZE_MB,
  formatFileSize,
  isFileSizeExceeded,
  getFileSizeErrorMessage,
} from '@/lib/avatar-constants';
import { toast } from 'sonner';

interface ProfilePictureUploadProps {
  currentImageUrl?: string;
  onImageChange: (imageUrl: string | null, imagePath?: string | null) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isWorkspaceLogo?: boolean;
  workspaceId?: string;
  showRemove?: boolean;
}

export function ProfilePictureUpload({
  currentImageUrl,
  onImageChange,
  disabled = false,
  size = 'md',
  isWorkspaceLogo = false,
  workspaceId,
}: ProfilePictureUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset error
    setError(null);

    // Validate file size
    if (isFileSizeExceeded(file.size)) {
      const errorMsg = getFileSizeErrorMessage(file.size);
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'File must be an image (JPEG, PNG, WebP, or GIF)';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      setPreviewUrl(preview);
    };
    reader.readAsDataURL(file);

    // Upload file
    await uploadFile(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setError(null);

      // Get auth session to include token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please log in.');
      }

      const formData = new FormData();
      formData.append('file', file);

      if (isWorkspaceLogo && workspaceId) {
        formData.append('workspace_id', workspaceId);
      }

      const endpoint = isWorkspaceLogo
        ? '/api/avatar/workspace/upload'
        : '/api/avatar/user/upload';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload avatar');
      }

      const data = await response.json();
      const imageUrl = data.avatarUrl || data.logoUrl;

      if (imageUrl) {
        onImageChange(imageUrl, file.name);
        toast.success(isWorkspaceLogo ? 'Logo uploaded successfully!' : 'Avatar uploaded successfully!');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload file';
      setError(errorMsg);
      setPreviewUrl(currentImageUrl || null);
      toast.error(errorMsg);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      setUploading(true);
      setError(null);

      // Get auth session to include token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please log in.');
      }

      const endpoint = isWorkspaceLogo
        ? '/api/avatar/workspace/remove'
        : '/api/avatar/user/remove';

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: isWorkspaceLogo ? JSON.stringify({ workspace_id: workspaceId }) : '{}',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove avatar');
      }

      setPreviewUrl(null);
      onImageChange(null, null);
      toast.success(isWorkspaceLogo ? 'Logo removed successfully!' : 'Avatar removed successfully!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove avatar';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Remove error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Current Avatar Display */}
      <div className="relative">
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Avatar preview"
              className={`${
                size === 'sm'
                  ? 'h-16 w-16'
                  : size === 'md'
                    ? 'h-20 w-20'
                    : size === 'lg'
                      ? 'h-24 w-24'
                      : 'h-32 w-32'
              } rounded-full object-cover border-2 border-gray-200`}
            />
            {!uploading && (
              <button
                onClick={handleRemove}
                disabled={disabled || uploading}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-full p-1 transition-colors"
                title="Remove avatar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div
            className={`${
              size === 'sm'
                ? 'h-16 w-16'
                : size === 'md'
                  ? 'h-20 w-20'
                  : size === 'lg'
                    ? 'h-24 w-24'
                    : 'h-32 w-32'
            } rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white border-2 border-gray-200`}
          >
            <Upload className="h-8 w-8" />
          </div>
        )}
      </div>

      {/* File Size Limit Info */}
      <div className="text-xs text-gray-500 text-center">
        Max file size: {MAX_AVATAR_FILE_SIZE_MB} MB
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 text-center bg-red-50 p-2 rounded w-full border border-red-200">
          {error}
        </div>
      )}

      {/* Upload Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
        aria-label="Upload image"
      />

      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {uploading ? 'Uploading...' : 'Choose Image'}
      </Button>
    </div>
  );
}
