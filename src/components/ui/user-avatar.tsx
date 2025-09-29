"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user: {
    username?: string;
    full_name?: string | null;
    avatar_url?: string | null;
    email: string;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  clickable?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm", 
  lg: "h-10 w-10 text-base",
  xl: "h-12 w-12 text-lg",
};

export function UserAvatar({ user, size = 'md', className, clickable = true, onClick }: UserAvatarProps) {
  const router = useRouter();
  
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

  const avatarElement = (
    <Avatar className={cn(sizeClasses[size], className)}>
      {user.avatar_url && (
        <AvatarImage 
          src={user.avatar_url} 
          alt={user.full_name || user.email}
          className="object-cover"
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