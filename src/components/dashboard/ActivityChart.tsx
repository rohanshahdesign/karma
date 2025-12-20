'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
}

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
  if (!data || data.length === 0) {
    return (
      <Card className="border-[#ebebeb]">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            {currencyName} Activity Trend
          </CardTitle>
          <CardDescription className="font-normal">
            Daily {currencyName} flow and redemptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm font-normal">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#ebebeb]">
      <CardHeader>
        <CardTitle className="text-lg font-medium">
          {currencyName} Activity Trend
        </CardTitle>
        <CardDescription className="font-normal">
          Daily {currencyName} flow and redemptions
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-4 pt-0">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
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
            {data[0]?.redeemed !== undefined && (
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
