import React from 'react';
import { Trophy, Award, Star, Users, Clock, Target, Zap } from 'lucide-react';
import { BadgeWithProgress } from '@/lib/database/badges-client';

interface CompactBadgeProps {
  badge: BadgeWithProgress;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const CompactBadge: React.FC<CompactBadgeProps> = ({ 
  badge, 
  size = 'sm',
  className = '' 
}) => {
  // Get badge icon based on criteria type
  const getBadgeIcon = () => {
    try {
      const criteria = badge.criteria as Record<string, unknown>;
      const type = criteria?.type;
      
      switch (type) {
        case 'transaction_milestone':
          return <Target className="w-full h-full" />;
        case 'karma_milestone':
          return <Star className="w-full h-full" />;
        case 'social_milestone':
          return <Users className="w-full h-full" />;
        case 'time_milestone':
          return <Clock className="w-full h-full" />;
        case 'streak_milestone':
          return <Zap className="w-full h-full" />;
        case 'special_achievement':
          return <Trophy className="w-full h-full" />;
        default:
          return <Award className="w-full h-full" />;
      }
    } catch {
      return <Award className="w-full h-full" />;
    }
  };

  // Get badge colors based on earned status and type
  const getBadgeStyle = () => {
    if (!badge.earned) {
      return {
        container: 'bg-gray-100 border-gray-200',
        icon: 'text-gray-400',
        background: 'bg-gray-50'
      };
    }
    
    try {
      const criteria = badge.criteria as Record<string, unknown>;
      const type = criteria?.type;
      
      switch (type) {
        case 'transaction_milestone':
          return {
            container: 'bg-blue-100 border-blue-200',
            icon: 'text-blue-600',
            background: 'bg-blue-50'
          };
        case 'karma_milestone':
          return {
            container: 'bg-yellow-100 border-yellow-200', 
            icon: 'text-yellow-600',
            background: 'bg-yellow-50'
          };
        case 'social_milestone':
          return {
            container: 'bg-green-100 border-green-200',
            icon: 'text-green-600', 
            background: 'bg-green-50'
          };
        case 'time_milestone':
          return {
            container: 'bg-purple-100 border-purple-200',
            icon: 'text-purple-600',
            background: 'bg-purple-50'
          };
        case 'streak_milestone':
          return {
            container: 'bg-orange-100 border-orange-200',
            icon: 'text-orange-600',
            background: 'bg-orange-50'
          };
        case 'special_achievement':
          return {
            container: 'bg-red-100 border-red-200',
            icon: 'text-red-600',
            background: 'bg-red-50'
          };
        default:
          return {
            container: 'bg-indigo-100 border-indigo-200',
            icon: 'text-indigo-600',
            background: 'bg-indigo-50'
          };
      }
    } catch {
      return {
        container: 'bg-indigo-100 border-indigo-200',
        icon: 'text-indigo-600', 
        background: 'bg-indigo-50'
      };
    }
  };

  const style = getBadgeStyle();
  const isEarned = badge.earned;

  const sizeClasses = {
    xs: {
      container: 'w-8 h-8',
      icon: 'w-4 h-4'
    },
    sm: {
      container: 'w-12 h-12',
      icon: 'w-6 h-6'
    },
    md: {
      container: 'w-16 h-16', 
      icon: 'w-8 h-8'
    }
  };

  return (
    <div 
      className={`
        ${sizeClasses[size].container} 
        ${style.container} 
        border rounded-lg flex items-center justify-center
        transition-all duration-200 hover:scale-105 
        ${isEarned ? 'shadow-sm hover:shadow-md' : 'opacity-60'}
        ${className}
      `}
      title={`${badge.name}: ${badge.description}${isEarned ? ' ✓ Earned' : ' - In Progress'}`}
    >
      <div className={`${sizeClasses[size].icon} ${style.icon}`}>
        {getBadgeIcon()}
      </div>
      
      {/* Earned indicator */}
      {isEarned && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
      )}
    </div>
  );
};

export default CompactBadge;