"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAvatarCache } from "@/contexts/AvatarCacheContext";

interface UserAvatarProps {
  user: {
    id?: string;
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    email: string;
    auth_user_id?: string;
    has_custom_avatar?: boolean;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | undefined;
  className?: string;
  clickable?: boolean;
  onClick?: () => void;
  workspaceId?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm", 
  lg: "h-10 w-10 text-base",
  xl: "h-12 w-12 text-lg",
  "2xl": "h-16 w-16 text-xl",
  "3xl": "h-20 w-20 text-2xl"
};

export function UserAvatar({ user, size = 'md', className, clickable = true, onClick }: UserAvatarProps) {
  const router = useRouter();
  const { getAvatarUrl: fetchCachedAvatarUrl } = useAvatarCache();
  
  // Avatar resolution logic:
  // 1. If user has custom avatar -> use avatar_url from database
  // 2. If not -> use cached Google avatar URL
  // 3. Otherwise -> use initials fallback
  const getInitialAvatarUrl = React.useCallback((): string | null => {
    if (!user.id) return null;
    
    // Check if user has a custom uploaded avatar
    const hasCustomAvatar = user.has_custom_avatar ?? false;
    
    if (hasCustomAvatar && user.avatar_url) {
      // Use the avatar_url stored in database (includes unique filename for cache busting)
      return user.avatar_url;
    }
    
    // For Google avatar, will fetch from cache/API
    return null;
  }, [user.id, user.has_custom_avatar, user.avatar_url]);

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(getInitialAvatarUrl());
  
  // Fetch and cache Google avatar URL if needed
  React.useEffect(() => {
    const loadCachedAvatarUrl = async () => {
      if (!user.id) return;
      
      const hasCustomAvatar = user.has_custom_avatar ?? false;
      
      // Skip if already have a custom avatar URL
      if (hasCustomAvatar && user.avatar_url) {
        setAvatarUrl(user.avatar_url);
        return;
      }
      
      // Skip if already have a URL set
      if (avatarUrl) return;
      
      // Fetch and cache the Google avatar URL (once per session)
      const cachedUrl = await fetchCachedAvatarUrl(user.id, hasCustomAvatar);
      if (cachedUrl) {
        setAvatarUrl(cachedUrl);
      }
    };
    
    loadCachedAvatarUrl();
  }, [user.id, user.has_custom_avatar, user.avatar_url, avatarUrl, fetchCachedAvatarUrl]);
  
  const getInitials = React.useCallback(() => {
    if (user.full_name) {
      const words = user.full_name.trim().split(' ');
      if (words.length === 1) {
        // Single word: take first 2 characters
        return words[0].substring(0, 2).toUpperCase();
      } else {
        // Multiple words: take first letter of first and last word (like RS for Rohan Shah)
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
      }
    }
    // Fallback to first 2 characters of email
    return user.email.substring(0, 2).toUpperCase();
  }, [user.full_name, user.email]);

  const handleClick = React.useCallback(() => {
    if (onClick) {
      onClick();
    } else if (clickable && user.username) {
      router.push(`/profile/${user.username}`);
    }
  }, [onClick, clickable, user.username, router]);

  const handleImageError = React.useCallback(() => {
    // If workspace picture fails to load, fallback to user's personal picture (avatar_url from Google)
    if (avatarUrl && user.avatar_url && avatarUrl !== user.avatar_url) {
      setAvatarUrl(user.avatar_url);
    }
  }, [avatarUrl, user.avatar_url]);

  const avatarElement = (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && (
        <AvatarImage 
          src={avatarUrl} 
          alt={user.full_name || user.email}
          className="object-cover"
          onError={handleImageError}
        />
      )}
      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );

  if (clickable && user.username) {
    return (
      <button
        onClick={handleClick}
        className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-transform hover:scale-105"
        title={`View ${getUserDisplayName(user)}'s profile`}
      >
        {avatarElement}
      </button>
    );
  }

  return avatarElement;
}

export function getUserDisplayName(user: { full_name?: string | null; email: string }): string {
  return user.full_name || user.email;
}
