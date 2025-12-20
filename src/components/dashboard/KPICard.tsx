'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  target?: number;
  progress?: number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  valueColor?: string;
}

export function KPICard({
  title,
  subtitle,
  value,
  target,
  progress,
  change,
  icon: Icon,
  iconColor = 'text-blue-600',
  valueColor = 'text-blue-600',
}: KPICardProps) {
  const progressValue =
    progress !== undefined
      ? progress
      : target
      ? (Number(value) / target) * 100
      : 0;

  return (
    <Card className="border-[#ebebeb]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-medium text-gray-800">{title}</span>
            {subtitle && (
              <span className="text-xs font-normal text-gray-500 block mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
        <div className="flex items-baseline justify-between mb-2">
          <span className={cn('text-3xl font-medium', valueColor)}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {change !== undefined && (
            <span
              className={cn(
                'text-xs font-medium',
                change >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {change >= 0 ? '+' : ''}
              {change.toFixed(1)}%
            </span>
          )}
        </div>
        {/* {target !== undefined && (
          <div className="space-y-1">
            <Progress value={Math.min(progressValue, 100)} className="h-1.5" />
            <p className="text-xs font-normal text-gray-500">
              Target: {target.toLocaleString()}
            </p>
          </div>
        )} */}
        {progress !== undefined && target === undefined && (
          <Progress
            value={Math.min(progressValue, 100)}
            className="h-1.5 mt-2"
          />
        )}
      </CardContent>
    </Card>
  );
}
