'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Profile } from '@/lib/supabase-types';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import {
  MAX_AVATAR_FILE_SIZE,
  isFileSizeExceeded,
  getFileSizeErrorMessage,
} from '@/lib/avatar-constants';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onProfileUpdated: (updatedProfile: Profile) => void;
}

interface ProfileFormData {
  full_name: string;
  job_title: string;
  department: string;
  bio: string;
  avatar_url: string | null;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onProfileUpdated,
}: EditProfileDialogProps) {
  const { refreshProfile } = useUser();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [workspaceDepartments, setWorkspaceDepartments] = useState<string[]>([]);
  const [unsavedChangesDialog, setUnsavedChangesDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    job_title: '',
    department: '',
    bio: '',
    avatar_url: null,
  });
  const [initialFormData, setInitialFormData] = useState<ProfileFormData>({
    full_name: '',
    job_title: '',
    department: '',
    bio: '',
    avatar_url: null,
  });

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData) || selectedFile !== null;

  // Cleanup object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Fetch workspace departments
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!open || !profile.workspace_id) return;
      
      try {
        // Get the current session to include auth token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error('No session found');
          setWorkspaceDepartments(['Frontend', 'Backend', 'UAT', 'QA', 'Design', 'Marketing', 'HR']);
          return;
        }

        const response = await fetch(`/api/workspaces/departments?workspace_id=${profile.workspace_id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        const data = await response.json();
        if (data.success && data.data?.departments) {
          setWorkspaceDepartments(data.data.departments);
        } else {
          // Fallback to default departments
          setWorkspaceDepartments(['Frontend', 'Backend', 'UAT', 'QA', 'Design', 'Marketing', 'HR']);
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        // Fallback to default departments
        setWorkspaceDepartments(['Frontend', 'Backend', 'UAT', 'QA', 'Design', 'Marketing', 'HR']);
      }
    };
    
    fetchDepartments();
  }, [open, profile.workspace_id]);

  // Initialize form data when profile changes or dialog opens
  useEffect(() => {
    if (profile && open) {
      const initialData = {
        full_name: profile.full_name || '',
        job_title: profile.job_title || '',
        department: profile.department || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || null,
      };
      setFormData(initialData);
      setInitialFormData(initialData);
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [profile, open]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (isFileSizeExceeded(file.size)) {
      const errorMsg = getFileSizeErrorMessage(file.size);
      toast.error(errorMsg);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Store the file and create preview
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);

      // Get auth session to include token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please log in.');
      }

      const formDataObj = new FormData();
      formDataObj.append('file', file);

      const response = await fetch('/api/avatar/user/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formDataObj,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload avatar');
      }

      const data = await response.json();
      const imageUrl = data.avatarUrl;

      if (imageUrl) {
        toast.success('Avatar uploaded successfully!');
        return imageUrl;
      }
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload file';
      toast.error(errorMsg);
      console.error('Upload error:', err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    // If there's a preview, just clear it (don't actually remove from server yet)
    if (selectedFile || previewUrl) {
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      toast.info('Avatar preview removed');
    } else {
      // If there's no preview, set avatar_url to null (will be saved on submit)
      setFormData(prev => ({
        ...prev,
        avatar_url: null,
      }));
      toast.info('Avatar removed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.department) {
      toast.error('Department is required');
      return;
    }
    
    setLoading(true);

    try {
      // If there's a selected file, upload it first
      let avatarUrl = formData.avatar_url;
      if (selectedFile) {
        console.log('Uploading new avatar file...');
        const uploadedUrl = await uploadFile(selectedFile);
        if (uploadedUrl) {
          console.log('Avatar uploaded successfully:', uploadedUrl);
          avatarUrl = uploadedUrl;
        } else {
          throw new Error('Failed to upload avatar');
        }
      }

      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const updatePayload = {
        profile_id: profile.id,
        updates: {
          ...formData,
          avatar_url: avatarUrl,
        },
      };
      
      console.log('Sending profile update with avatar_url:', updatePayload);

      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      const { profile: updatedProfile } = await response.json();
      
      console.log('Profile updated successfully:', updatedProfile);
      
      toast.success('Profile updated successfully!');
      onProfileUpdated(updatedProfile);
      
      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);

      onOpenChange(false);

      // Refresh the global user context in background (non-blocking)
      // This ensures cache is invalidated without blocking the UI
      refreshProfile().catch(err => {
        console.error('Background profile refresh failed:', err);
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasChanges) {
      setUnsavedChangesDialog(true);
    } else {
      onOpenChange(newOpen);
    }
  };

  const handleDiscard = () => {
    setUnsavedChangesDialog(false);
    setFormData(initialFormData);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onOpenChange(false);
  };

  const handleSaveChanges = async () => {
    setUnsavedChangesDialog(false);
    await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  const handleCancel = () => {
    if (hasChanges) {
      setUnsavedChangesDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center space-y-4">
              <Label className="text-sm font-medium">Profile Picture</Label>
              
              {/* Display avatar with remove button */}
              <div className="relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Avatar preview"
                    className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <UserAvatar
                    user={profile}
                    size="3xl"
                    clickable={false}
                  />
                )}
                {(formData.avatar_url || previewUrl) && !uploading && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-full p-1 transition-colors"
                    title="Remove avatar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* File input (hidden) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                aria-label="Upload image"
              />

              {/* Upload/Change button */}
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || loading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {uploading ? 'Uploading...' : previewUrl || formData.avatar_url ? 'Change Image' : 'Upload Image'}
              </Button>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Enter your full name"
                disabled={loading}
              />
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                type="text"
                value={formData.job_title}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
                placeholder="e.g., Senior Developer, Marketing Manager"
                disabled={loading}
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">
                Department <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.department}
                onValueChange={(value) => handleInputChange('department', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {workspaceDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                className="min-h-[80px] resize-none"
                maxLength={500}
                disabled={loading}
              />
              <div className="text-xs text-gray-500 text-right">
                {formData.bio.length}/500
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading || uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || uploading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Profile'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog open={unsavedChangesDialog} onOpenChange={setUnsavedChangesDialog}>
        <DialogContent className="max-w-sm z-[10000]">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-700">
              You have unsaved changes. Do you want to save or discard them?
            </p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUnsavedChangesDialog(false)}
            >
              Keep Editing
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDiscard}
            >
              Discard
            </Button>
            <Button
              type="button"
              onClick={handleSaveChanges}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
