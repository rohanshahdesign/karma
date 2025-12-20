'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Coins, TrendingUp } from 'lucide-react';

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
            <TrendingUp className="h-5 w-5 text-green-600" />
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
            <Coins className="h-5 w-5 text-blue-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
