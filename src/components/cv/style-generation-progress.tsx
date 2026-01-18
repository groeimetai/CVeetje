'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Layout,
  Sparkles,
  Type,
  Palette,
  Tags,
  Settings2,
  Check,
  Loader2,
} from 'lucide-react';

export interface StyleGenerationStep {
  id: number;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'pending' | 'in_progress' | 'completed';
  result?: string;
}

const STYLE_GENERATION_STEPS: Omit<StyleGenerationStep, 'status' | 'result'>[] = [
  {
    id: 1,
    name: 'Layout',
    description: 'Structuur & indeling',
    icon: Layout,
  },
  {
    id: 2,
    name: 'Header',
    description: 'Eyecatcher ontwerp',
    icon: Sparkles,
  },
  {
    id: 3,
    name: 'Typography',
    description: 'Fonts & groottes',
    icon: Type,
  },
  {
    id: 4,
    name: 'Colors',
    description: 'Kleurenpalet',
    icon: Palette,
  },
  {
    id: 5,
    name: 'Skills',
    description: 'Skill weergave',
    icon: Tags,
  },
  {
    id: 6,
    name: 'Details',
    description: 'Finishing touches',
    icon: Settings2,
  },
];

interface StyleGenerationProgressProps {
  currentStep: number;
  stepResults: Record<number, string>;
  isComplete: boolean;
}

export function StyleGenerationProgress({
  currentStep,
  stepResults,
  isComplete,
}: StyleGenerationProgressProps) {
  const [animatedStep, setAnimatedStep] = useState(0);

  // Animate step transitions
  useEffect(() => {
    if (currentStep > animatedStep) {
      const timer = setTimeout(() => {
        setAnimatedStep(currentStep);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, animatedStep]);

  return (
    <div className="w-full py-4">
      {/* Progress Bar */}
      <div className="relative mb-6">
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
            style={{
              width: isComplete ? '100%' : `${((currentStep - 1) / 6) * 100}%`,
            }}
          />
        </div>
        {/* Animated pulse on active position */}
        {!isComplete && currentStep > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary animate-pulse"
            style={{
              left: `calc(${((currentStep - 0.5) / 6) * 100}% - 4px)`,
            }}
          />
        )}
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {STYLE_GENERATION_STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id || isComplete;
          const isPending = currentStep < step.id;
          const result = stepResults[step.id];

          return (
            <div
              key={step.id}
              className={cn(
                "relative flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-300",
                isActive && "border-primary bg-primary/5 scale-105 shadow-md",
                isCompleted && "border-green-500/50 bg-green-50/50",
                isPending && "border-muted bg-muted/20 opacity-50"
              )}
            >
              {/* Step Number Badge */}
              <div
                className={cn(
                  "absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-green-500 text-white",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted && !isActive ? (
                  <Check className="h-3 w-3" />
                ) : (
                  step.id
                )}
              </div>

              {/* Icon */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center mb-2",
                  isActive && "bg-primary/20",
                  isCompleted && "bg-green-500/20",
                  isPending && "bg-muted"
                )}
              >
                {isActive ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isCompleted && "text-green-600",
                      isPending && "text-muted-foreground"
                    )}
                  />
                )}
              </div>

              {/* Step Name */}
              <div
                className={cn(
                  "text-xs font-medium text-center",
                  isActive && "text-primary",
                  isCompleted && "text-green-700",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.name}
              </div>

              {/* Step Description or Result */}
              <div className="text-[10px] text-muted-foreground text-center mt-0.5 leading-tight">
                {result || step.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Action Text */}
      {!isComplete && currentStep > 0 && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span className="text-sm text-primary font-medium">
              Stap {currentStep}/6: {STYLE_GENERATION_STEPS[currentStep - 1]?.name} genereren...
            </span>
          </div>
        </div>
      )}

      {/* Complete Message */}
      {isComplete && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              Style succesvol gegenereerd!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Export the steps for use elsewhere
export { STYLE_GENERATION_STEPS };
