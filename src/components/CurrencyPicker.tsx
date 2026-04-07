import React from 'react';
import { useCurrency, Currency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'CRC', label: 'CRC (₡)', symbol: '₡' },
];

export function CurrencyPicker() {
  const { currency, setCurrency } = useCurrency();
  const current = OPTIONS.find(o => o.value === currency)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Currency">
          <span className="text-sm font-bold">{current.symbol}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setCurrency(opt.value)}
            className={currency === opt.value ? 'bg-accent' : ''}
          >
            <span className="font-mono mr-2">{opt.symbol}</span>
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
