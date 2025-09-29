import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Filter, Trophy } from 'lucide-react';
import Badge from './Badge';
import { BadgeWithProgress, getBadgeCategories } from '@/lib/database/badges-client';

interface BadgesListProps {
  badges: BadgeWithProgress[];
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  emptyMessage?: string;
  className?: string;
}

const BadgesList: React.FC<BadgesListProps> = ({
  badges,
  showProgress = false,
  size = 'md',
  title = 'Badges',
  emptyMessage = 'No badges available yet',
  className = ''
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  
  // Get badge categories for filtering
  const categories = useMemo(() => getBadgeCategories(badges), [badges]);
  
  // Filter badges based on selected filter
  const filteredBadges = useMemo(() => {
    if (selectedFilter === 'all') return badges;
    if (selectedFilter === 'earned') return badges.filter(b => b.earned);
    if (selectedFilter === 'unearned') return badges.filter(b => !b.earned);
    
    // Filter by category
    return badges.filter(badge => {
      try {
        const criteria = badge.criteria as Record<string, unknown>;
        const type = criteria?.type;
        
        switch (selectedFilter) {
          case 'Activity':
            return type === 'transaction_milestone';
          case 'Generosity':
            return type === 'karma_milestone';
          case 'Social':
            return type === 'social_milestone';
          case 'Tenure':
            return type === 'time_milestone';
          case 'Consistency':
            return type === 'streak_milestone';
          case 'Special':
            return type === 'special_achievement';
          default:
            return false;
        }
      } catch {
        return selectedFilter === 'Achievement';
      }
    });
  }, [badges, selectedFilter]);

  // Stats
  const earnedCount = badges.filter(b => b.earned).length;
  const totalCount = badges.length;

  if (badges.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            {title}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {earnedCount} of {totalCount} badges earned
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter badges:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedFilter('all')}
            className="h-8 text-xs"
          >
            All ({totalCount})
          </Button>
          <Button
            size="sm"
            variant={selectedFilter === 'earned' ? 'default' : 'outline'}
            onClick={() => setSelectedFilter('earned')}
            className="h-8 text-xs"
          >
            Earned ({earnedCount})
          </Button>
          <Button
            size="sm"
            variant={selectedFilter === 'unearned' ? 'default' : 'outline'}
            onClick={() => setSelectedFilter('unearned')}
            className="h-8 text-xs"
          >
            In Progress ({totalCount - earnedCount})
          </Button>
          {categories.map(category => {
            const categoryCount = badges.filter(badge => {
              try {
                const criteria = badge.criteria as Record<string, unknown>;
                const type = criteria?.type;
                
                switch (category) {
                  case 'Activity':
                    return type === 'transaction_milestone';
                  case 'Generosity':
                    return type === 'karma_milestone';
                  case 'Social':
                    return type === 'social_milestone';
                  case 'Tenure':
                    return type === 'time_milestone';
                  case 'Consistency':
                    return type === 'streak_milestone';
                  case 'Special':
                    return type === 'special_achievement';
                  default:
                    return false;
                }
              } catch {
                return category === 'Achievement';
              }
            }).length;

            return (
              <Button
                key={category}
                size="sm"
                variant={selectedFilter === category ? 'default' : 'outline'}
                onClick={() => setSelectedFilter(category)}
                className="h-8 text-xs"
              >
                {category} ({categoryCount})
              </Button>
            );
          })}
        </div>
      </div>

      {/* Badges Grid */}
      {filteredBadges.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Trophy className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            No badges match the selected filter
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedFilter('all')}
            className="mt-2"
          >
            Show All Badges
          </Button>
        </div>
      ) : (
        <div className={`grid gap-4 ${
          size === 'sm' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' 
            : size === 'lg'
            ? 'grid-cols-1 lg:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {filteredBadges.map(badge => (
            <Badge
              key={badge.id}
              badge={badge}
              size={size}
              showProgress={showProgress}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BadgesList;