'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar, getUserDisplayName } from '@/components/ui/user-avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Profile } from '@/lib/supabase-types';
import { formatCurrencyAmount } from '@/lib/currency';

interface Contributor {
  profile: Profile;
  total_received: number;
  rank: number;
}

export type DateFilter = '7days' | '30days' | 'all';

interface TopContributorsProps {
  contributors: Contributor[];
  currencyName: string;
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
}

export function TopContributors({
  contributors,
  currencyName,
  dateFilter,
  onDateFilterChange,
}: TopContributorsProps) {
  return (
    <Card className="border-[#ebebeb]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
        <CardTitle className="text-lg font-medium">Top Performers</CardTitle>
        <Select value={dateFilter} onValueChange={onDateFilterChange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {!contributors || contributors.length === 0 ? (
          <p className="text-sm font-normal text-gray-500">No data available</p>
        ) : (
          <div className="space-y-3">
            {contributors.map((contributor) => (
              <div
                key={contributor.profile.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-accent">
                      #{contributor.rank}
                    </span>
                  </div>
                  <UserAvatar user={contributor.profile} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getUserDisplayName(contributor.profile)}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrencyAmount(
                      contributor.total_received,
                      currencyName
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
