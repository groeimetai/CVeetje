'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Coins } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { StepTokenUsage } from '@/types';

// Hardcoded USD to EUR conversion rate
const USD_TO_EUR = 0.92;

interface TokenUsageDisplayProps {
  history: StepTokenUsage[];
  modelName?: string;
}

const STEP_LABELS: Record<StepTokenUsage['step'], string> = {
  linkedin: 'LinkedIn Parse',
  job: 'Job Parse',
  style: 'Style',
  generate: 'Generate',
  regenerate: 'Regenerate',
};

function formatNumber(num: number): string {
  return num.toLocaleString('nl-NL');
}

function formatCost(usd: number): string {
  const eur = usd * USD_TO_EUR;
  // Show more decimal places for very small amounts
  if (eur < 0.01) {
    return `€${eur.toFixed(4)}`;
  }
  return `€${eur.toFixed(2)}`;
}

export function TokenUsageDisplay({ history, modelName }: TokenUsageDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totals = useMemo(() => {
    return history.reduce(
      (acc, item) => ({
        promptTokens: acc.promptTokens + item.usage.promptTokens,
        completionTokens: acc.completionTokens + item.usage.completionTokens,
        totalTokens: acc.totalTokens + item.usage.promptTokens + item.usage.completionTokens,
        totalCostUsd: acc.totalCostUsd + item.cost.total,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0, totalCostUsd: 0 }
    );
  }, [history]);

  // Don't render if no usage data
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Inline badge - styled to match the wizard */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border bg-card hover:bg-accent/50 transition-colors"
      >
        <Coins className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {formatNumber(totals.totalTokens)} tokens
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="font-medium">{formatCost(totals.totalCostUsd)}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
        )}
      </button>

      {/* Expanded panel - dropdown style */}
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 rounded-lg border bg-card shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Token Usage</h4>

            {history.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{STEP_LABELS[item.step]}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCost(item.cost.total)}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>In: {formatNumber(item.usage.promptTokens)}</span>
                  <span>Out: {formatNumber(item.usage.completionTokens)}</span>
                </div>
                {index < history.length - 1 && <Separator className="mt-2" />}
              </div>
            ))}

            <Separator />

            {/* Totals */}
            <div className="space-y-1">
              <div className="flex justify-between items-center font-medium">
                <span className="text-sm">Totaal</span>
                <span className="text-sm">{formatCost(totals.totalCostUsd)}</span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>In: {formatNumber(totals.promptTokens)}</span>
                <span>Out: {formatNumber(totals.completionTokens)}</span>
              </div>
            </div>

            {/* Model info */}
            {modelName && (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  Model: {modelName}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
