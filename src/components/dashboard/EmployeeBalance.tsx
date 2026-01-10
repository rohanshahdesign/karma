'use client';

import { Card, CardContent } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { CoinsSwapIcon, AnalyticsUpIcon } from '@hugeicons/core-free-icons';

interface EmployeeBalanceProps {
  redeemableBalance: number;
  givingBalance: number;
  currencyName: string;
}

export function EmployeeBalance({
  redeemableBalance,
  givingBalance,
  currencyName,
}: EmployeeBalanceProps) {
  return (
    <div className="space-y-4">
      {/* Redeemable Balance - Prominent */}
      <Card className="border-[#ebebeb]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-normal text-gray-600">
              Accumulated {currencyName}
            </span>
            <HugeiconsIcon icon={AnalyticsUpIcon} size={20} className="text-green-600" />
          </div>
          <div className="text-4xl md:text-5xl font-thin text-green-600 mb-1">
            {redeemableBalance}
          </div>
          <p className="text-xs font-normal text-gray-500">
            Available to redeem for rewards
          </p>
        </CardContent>
      </Card>

      {/* Giving Balance - Secondary */}
      <Card className="border-[#ebebeb]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-normal text-gray-600">
                Giving Balance
              </span>
              <div className="text-2xl font-medium text-blue-600 mt-1">
                {givingBalance}
              </div>
            </div>
            <HugeiconsIcon icon={CoinsSwapIcon} size={20} className="text-blue-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
