'use client';

import { useState, useEffect } from 'react';
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
import { ProfilePictureUpload } from '@/components/ui/profile-picture-upload';
import { Profile } from '@/lib/supabase-types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [workspaceDepartments, setWorkspaceDepartments] = useState<string[]>([]);
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    job_title: '',
    department: '',
    bio: '',
    avatar_url: null,
  });

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
      setFormData({
        full_name: profile.full_name || '',
        job_title: profile.job_title || '',
        department: profile.department || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || null,
      });
    }
  }, [profile, open]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAvatarChange = (imageUrl: string | null, _imagePath: string | null) => {
    void _imagePath;
    setFormData(prev => ({
      ...prev,
      avatar_url: imageUrl,
    }));
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
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          profile_id: profile.id,
          updates: formData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      const { profile: updatedProfile } = await response.json();
      
      toast.success('Profile updated successfully!');
      onProfileUpdated(updatedProfile);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        job_title: profile.job_title || '',
        department: profile.department || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || null,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center">
            <Label className="text-sm font-medium mb-4">Profile Picture</Label>
            <ProfilePictureUpload
              currentImageUrl={formData.avatar_url || undefined}
              onImageChange={handleAvatarChange}
              disabled={loading}
              size="md"
            />
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
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
