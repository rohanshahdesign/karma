'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

interface ValidationResult {
  valid: boolean;
  available: boolean;
  message: string;
}

export function UsernameInput({
  value,
  onChange,
  label = 'Username',
  placeholder = 'e.g. john_doe',
  required = false,
  className = '',
  disabled = false
}: UsernameInputProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);

  // Debounced validation function
  const validateUsername = useCallback(async (username: string) => {
    if (!username || username.length < 2) {
      setValidation(null);
      return;
    }

    setIsValidating(true);
    try {
      // Get auth token for workspace-aware validation
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/validation/username?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers
      });
      
      const result: ValidationResult = await response.json();
      setValidation(result);
    } catch (error) {
      console.error('Username validation error:', error);
      setValidation({
        valid: false,
        available: false,
        message: 'Unable to validate username'
      });
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Debounce validation calls
  useEffect(() => {
    if (!hasTyped || !value) return;
    
    const timeoutId = setTimeout(() => {
      validateUsername(value.toLowerCase());
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [value, validateUsername, hasTyped]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHasTyped(true);
    onChange(newValue);
    
    // Clear validation immediately when typing
    setValidation(null);
  };

  const getValidationIcon = () => {
    if (isValidating) {
      return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
    }
    
    if (validation) {
      if (validation.valid && validation.available) {
        return <Check className="h-4 w-4 text-green-500" />;
      } else {
        return <X className="h-4 w-4 text-red-500" />;
      }
    }
    
    return null;
  };

  const getValidationMessage = () => {
    if (!hasTyped || !value || value.length < 2) return null;
    
    if (validation) {
      const isSuccess = validation.valid && validation.available;
      return (
        <div className={cn(
          'flex items-center gap-2 text-sm mt-1',
          isSuccess ? 'text-green-600' : 'text-red-600'
        )}>
          {getValidationIcon()}
          <span>{validation.message}</span>
        </div>
      );
    }
    
    return null;
  };

  const getInputBorderColor = () => {
    if (!hasTyped || !value || value.length < 2) return '';
    
    if (isValidating) return 'border-gray-300';
    
    if (validation) {
      return validation.valid && validation.available 
        ? 'border-green-300 focus:border-green-500' 
        : 'border-red-300 focus:border-red-500';
    }
    
    return '';
  };

  return (
    <div className={className}>
      <Label htmlFor="username">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative mt-1">
        <Input
          id="username"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn('pr-10', getInputBorderColor())}
          autoComplete="username"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {getValidationIcon()}
        </div>
      </div>
      {getValidationMessage()}
      <p className="text-xs text-gray-500 mt-1">
        2-30 characters, letters, numbers, hyphens, and underscores only
      </p>
    </div>
  );
}

// Export validation function for form validation
export async function validateUsernameSync(username: string): Promise<ValidationResult> {
  if (!username || username.trim().length === 0) {
    return { valid: false, available: false, message: 'Username is required' };
  }

  const trimmedUsername = username.trim().toLowerCase();

  // Client-side format validation
  const USERNAME_REGEX = /^[a-zA-Z0-9_-]{2,30}$/;
  if (!USERNAME_REGEX.test(trimmedUsername)) {
    return {
      valid: false,
      available: false,
      message: 'Username must be 2-30 characters long and contain only letters, numbers, hyphens, and underscores'
    };
  }

  // For server-side validation, we'd need to call the API
  // This function is for immediate validation feedback
  return { valid: true, available: true, message: 'Checking availability...' };
}