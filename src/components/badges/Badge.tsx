import React from 'react';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Award, Star, Trophy, Users, Clock, Target, Zap } from 'lucide-react';
import { BadgeWithProgress } from '@/lib/database/badges-client';
import { formatDistanceToNow } from 'date-fns';

interface BadgeProps {
  badge: BadgeWithProgress;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showDescription?: boolean;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ 
  badge, 
  size = 'md', 
  showProgress = false, 
  showDescription = true, 
  className = '' 
}) => {
  // Get badge icon based on criteria type
  const getBadgeIcon = () => {
    try {
      const criteria = badge.criteria as Record<string, unknown>;
      const type = criteria?.type;
      
      switch (type) {
        case 'transaction_milestone':
          return <Target className="h-4 w-4" />;
        case 'karma_milestone':
          return <Star className="h-4 w-4" />;
        case 'social_milestone':
          return <Users className="h-4 w-4" />;
        case 'time_milestone':
          return <Clock className="h-4 w-4" />;
        case 'streak_milestone':
          return <Zap className="h-4 w-4" />;
        case 'special_achievement':
          return <Trophy className="h-4 w-4" />;
        default:
          return <Award className="h-4 w-4" />;
      }
  } catch {
      return <Award className="h-4 w-4" />;
    }
  };

  // Get badge color based on earned status and type
  const getBadgeColor = () => {
    if (!badge.earned) {
      return 'bg-gray-100 text-gray-500 border-gray-200';
    }
    
    try {
      const criteria = badge.criteria as Record<string, unknown>;
      const type = criteria?.type;
      
      switch (type) {
        case 'transaction_milestone':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'karma_milestone':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'social_milestone':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'time_milestone':
          return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'streak_milestone':
          return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'special_achievement':
          return 'bg-red-100 text-red-800 border-red-200';
        default:
          return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      }
    } catch {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (!badge.progress || !showProgress) return null;
    return Math.min(100, Math.round((badge.progress.current_value / badge.progress.target_value) * 100));
  };

  const progressPercentage = getProgressPercentage();

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4'
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  return (
    <div 
      className={`relative border rounded-lg transition-all duration-200 ${
        badge.earned 
          ? 'hover:shadow-md border-opacity-50' 
          : 'opacity-75 hover:opacity-90'
      } ${getBadgeColor()} ${sizeClasses[size]} ${className}`}
    >
      {/* Badge Icon and Name */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`${badge.earned ? 'text-current' : 'text-gray-400'}`}>
          {React.cloneElement(getBadgeIcon(), { className: iconSizeClasses[size] })}
        </div>
        <h4 className={`font-semibold ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}`}>
          {badge.name}
        </h4>
        {badge.earned && (
          <div className="ml-auto">
            <UIBadge className="bg-green-500 text-white text-xs px-1.5 py-0.5">
              ✓
            </UIBadge>
          </div>
        )}
      </div>

      {/* Description */}
      {showDescription && (
        <p className={`text-current opacity-80 ${size === 'sm' ? 'text-xs' : 'text-sm'} mb-2`}>
          {badge.description}
        </p>
      )}

      {/* Progress Bar (for unearned badges with progress) */}
      {showProgress && progressPercentage !== null && !badge.earned && (
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs opacity-75">Progress</span>
            <span className="text-xs font-medium">
              {badge.progress?.current_value} / {badge.progress?.target_value}
            </span>
          </div>
          <div className="w-full bg-current bg-opacity-20 rounded-full h-2">
            <div 
              className="bg-current bg-opacity-60 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-center mt-1 opacity-75">
            {progressPercentage}% complete
          </div>
        </div>
      )}

      {/* Earned timestamp */}
      {badge.earned && badge.earned_at && (
        <div className="text-xs opacity-75">
          Earned {formatDistanceToNow(new Date(badge.earned_at), { addSuffix: true })}
        </div>
      )}
    </div>
  );
};

export default Badge;