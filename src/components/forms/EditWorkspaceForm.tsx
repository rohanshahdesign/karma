'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DepartmentManager } from '@/components/ui/department-manager';
import { ProfilePictureUpload } from '@/components/ui/profile-picture-upload';
import { toast } from 'sonner';

interface EditWorkspaceFormProps {
  workspaceId: string;
  initialData: {
    currency_name: string;
    min_transaction_amount: number;
    max_transaction_amount: number;
    daily_limit_percentage: number;
    departments: string[];
    logo_url?: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditWorkspaceForm({
  workspaceId,
  initialData,
  onSuccess,
  onCancel,
}: EditWorkspaceFormProps) {
  const [settings, setSettings] = useState(initialData);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialData.logo_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSetting = <K extends keyof typeof initialData>(
    key: K,
    value: typeof initialData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Update workspace settings
      const { error: settingsError } = await supabase
        .from('workspace_settings')
        .upsert({
          workspace_id: workspaceId,
          min_transaction_amount: settings.min_transaction_amount,
          max_transaction_amount: settings.max_transaction_amount,
          daily_limit_percentage: settings.daily_limit_percentage,
          currency_name: settings.currency_name,
          departments: settings.departments,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id',
          ignoreDuplicates: false
        });

      if (settingsError) throw settingsError;

      // Update workspace with currency name and logo
      const { error: workspaceError } = await supabase
        .from('workspaces')
        .update({
          currency_name: settings.currency_name,
          logo_url: logoUrl || null,
        })
        .eq('id', workspaceId);

      if (workspaceError) throw workspaceError;

      toast.success('Workspace settings updated successfully!');
      onSuccess();
    } catch (err: unknown) {
      console.error('Workspace update error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMsg);
      toast.error(`Error updating workspace: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Currency Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Currency Settings</h3>

        <div>
          <Label htmlFor="currency_name">Currency Name</Label>
          <Input
            id="currency_name"
            value={settings.currency_name}
            onChange={(e) => updateSetting('currency_name', e.target.value)}
            placeholder="e.g. Karma, Points, Kudos"
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            What should your recognition currency be called?
          </p>
        </div>
      </div>

      <Separator />

      {/* Transaction Limits */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Transaction Limits</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="min_transaction_amount">Minimum Amount</Label>
            <Input
              id="min_transaction_amount"
              type="number"
              min="1"
              max="50"
              value={settings.min_transaction_amount}
              onChange={(e) => updateSetting('min_transaction_amount', parseInt(e.target.value) || 5)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="max_transaction_amount">Maximum Amount</Label>
            <Input
              id="max_transaction_amount"
              type="number"
              min="5"
              max="100"
              value={settings.max_transaction_amount}
              onChange={(e) => updateSetting('max_transaction_amount', parseInt(e.target.value) || 20)}
              className="mt-1"
            />
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Set the minimum and maximum {settings.currency_name} amounts for single transactions
        </p>
      </div>

      <Separator />

      {/* Daily Limit */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Daily Spending Limit</h3>

        <div>
          <Label htmlFor="daily_limit_percentage">Daily Limit Percentage</Label>
          <Input
            id="daily_limit_percentage"
            type="number"
            min="10"
            max="100"
            value={settings.daily_limit_percentage}
            onChange={(e) => updateSetting('daily_limit_percentage', parseInt(e.target.value) || 30)}
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            Maximum percentage of monthly allowance that can be spent per day
          </p>
        </div>
      </div>

      <Separator />

      {/* Department Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Department Configuration</h3>
        <p className="text-sm text-gray-600">
          Manage departments for your workspace. Team members will select from these when joining or updating their profile.
        </p>
        <DepartmentManager
          departments={settings.departments}
          onChange={(newDepartments) => updateSetting('departments', newDepartments)}
          disabled={isSubmitting}
        />
      </div>

      <Separator />

      {/* Workspace Logo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Workspace Logo</h3>
        <p className="text-sm text-gray-600">
          Upload a logo to brand your workspace (optional). If not provided, a default will be used.
        </p>
        <ProfilePictureUpload
          onImageChange={(imageUrl) => setLogoUrl(imageUrl)}
          currentImageUrl={logoUrl || undefined}
          size="lg"
          showRemove={true}
        />
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
