'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface ChartDataPoint {
  date: string;
  sent: number;
  received: number;
  redeemed?: number;
  dateValue?: Date; // Store actual date for filtering
}

type DateFilter = 'all' | 'today' | '7days' | '30days';

interface ActivityChartProps {
  data: ChartDataPoint[];
  currencyName: string;
}

const chartConfig = {
  sent: {
    label: 'Sent',
    color: '#3b82f6',
  },
  received: {
    label: 'Received',
    color: '#10b981',
  },
  redeemed: {
    label: 'Redeemed',
    color: '#f97316',
  },
} satisfies ChartConfig;

export function ActivityChart({ data, currencyName }: ActivityChartProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('7days');

  // Filter data based on selected date range
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Ensure all data points have dateValue
    const dataWithDates = data.map((point) => {
      if (!point.dateValue) {
        // Fallback: try to parse the date string
        // This shouldn't happen if data is created correctly
        return {
          ...point,
          dateValue: new Date(point.date),
        };
      }
      return point;
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case '7days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7); // Exactly 7 days back
        endDate = new Date(today);
        break;
      case '30days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30); // Exactly 30 days back
        endDate = new Date(today);
        break;
      case 'all':
      default:
        return dataWithDates;
    }

    if (startDate && endDate) {
      // Normalize dates to midnight for comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      // First, filter existing data to the date range
      const filtered = dataWithDates.filter((point) => {
        if (!point.dateValue) return false;

        const pointDate = new Date(point.dateValue);
        pointDate.setHours(0, 0, 0, 0);

        // Compare dates at midnight for accurate comparison
        return (
          pointDate.getTime() >= startDate!.getTime() &&
          pointDate.getTime() <= endDate!.getTime()
        );
      });

      // Fill in missing dates with zero values
      const filledData: ChartDataPoint[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dateKey = currentDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        // Check if we have data for this date
        const existingData = filtered.find((point) => {
          if (!point.dateValue) return false;
          const pointDate = new Date(point.dateValue);
          pointDate.setHours(0, 0, 0, 0);
          return pointDate.getTime() === currentDate.getTime();
        });

        if (existingData) {
          filledData.push(existingData);
        } else {
          // Add zero values for missing dates
          filledData.push({
            date: dateKey,
            sent: 0,
            received: 0,
            dateValue: new Date(currentDate),
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return filledData;
    }

    return dataWithDates;
  }, [data, dateFilter]);

  if (!data || data.length === 0) {
    return (
      <Card className="border-[#ebebeb] lg:flex lg:flex-col lg:h-full">
        <CardHeader className="lg:flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium">
                {currencyName} Activity Trend
              </CardTitle>
              <CardDescription className="font-normal">
                Daily {currencyName} flow and redemptions
              </CardDescription>
            </div>
            <Select
              value={dateFilter}
              onValueChange={(value) => setDateFilter(value as DateFilter)}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-4 pt-0 lg:flex-1 lg:min-h-0">
          <div className="h-64 lg:h-full flex items-center justify-center text-gray-400 text-sm font-normal">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#ebebeb] lg:flex lg:flex-col lg:h-full">
      <CardHeader className="lg:flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">
              {currencyName} Activity Trend
            </CardTitle>
            <CardDescription className="font-normal">
              Daily {currencyName} flow and redemptions
            </CardDescription>
          </div>
          <Select
            value={dateFilter}
            onValueChange={(value) => setDateFilter(value as DateFilter)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-4 pt-0 lg:flex-1 lg:min-h-0">
        <ChartContainer
          config={chartConfig}
          className="h-64 lg:h-full lg:aspect-auto w-full"
        >
          <AreaChart
            accessibilityLayer
            data={filteredData}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="#ebebeb"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: '#666', fontSize: 12 }}
              padding={{ left: 0, right: 0 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: '#666', fontSize: 12 }}
              width={40}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient
                id="gradient-chart-sent"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-sent)"
                  stopOpacity={0.5}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-sent)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id="gradient-chart-received"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-received)"
                  stopOpacity={0.5}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-received)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              {data[0]?.redeemed !== undefined && (
                <linearGradient
                  id="gradient-chart-redeemed"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-redeemed)"
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-redeemed)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              )}
            </defs>
            <Area
              dataKey="received"
              fill="url(#gradient-chart-received)"
              fillOpacity={0.4}
              stroke="var(--color-received)"
              strokeWidth={1.5}
            />
            <Area
              dataKey="sent"
              fill="url(#gradient-chart-sent)"
              fillOpacity={0.4}
              stroke="var(--color-sent)"
              strokeWidth={1.5}
            />
            {filteredData[0]?.redeemed !== undefined && (
              <Area
                dataKey="redeemed"
                fill="url(#gradient-chart-redeemed)"
                fillOpacity={0.4}
                stroke="var(--color-redeemed)"
                strokeWidth={1.5}
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
