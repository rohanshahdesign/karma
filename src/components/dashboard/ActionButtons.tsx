'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { SentIcon, GiftIcon } from '@hugeicons/core-free-icons';
import { CURRENCY_PATTERNS } from '@/lib/currency';

interface ActionButtonsProps {
  currencyName: string;
}

export function ActionButtons({ currencyName }: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Button
        asChild
        className="h-16 md:h-20 bg-white border border-[#ebebeb] hover:bg-gray-50/80 text-gray-900 font-medium text-lg transition-colors"
      >
        <Link href="/send" className="flex items-center justify-center gap-3">
          <HugeiconsIcon icon={SentIcon} size={20} />
          <span>{CURRENCY_PATTERNS.SEND_KARMA(currencyName)}</span>
        </Link>
      </Button>
      <Button
        asChild
        className="h-16 md:h-20 bg-white border border-[#ebebeb] hover:bg-gray-50/80 text-gray-900 font-medium text-lg transition-colors"
      >
        <Link
          href="/workspaces"
          className="flex items-center justify-center gap-3"
        >
          <HugeiconsIcon icon={GiftIcon} size={20} />
          <span>Redeem Rewards</span>
        </Link>
      </Button>
    </div>
  );
}
