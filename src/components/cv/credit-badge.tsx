import { Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PLATFORM_CREDIT_COSTS, type PlatformOperation } from '@/lib/ai/platform-config';

/**
 * Kostenlabel voor knoppen die platform-credits verbruiken. De kosten komen
 * altijd uit PLATFORM_CREDIT_COSTS (single source of truth), zodat UI en
 * server-side afrekening niet meer uit elkaar kunnen lopen.
 */
export function CreditBadge({
  operation,
  amount,
  className = 'ml-2',
}: {
  operation?: PlatformOperation;
  amount?: number;
  className?: string;
}) {
  const cost = amount ?? (operation ? PLATFORM_CREDIT_COSTS[operation] : 0);
  if (!cost) return null;
  return (
    <Badge variant="secondary" className={className}>
      <Coins className="h-3 w-3 mr-1" aria-hidden="true" />
      {cost} {cost === 1 ? 'credit' : 'credits'}
    </Badge>
  );
}
