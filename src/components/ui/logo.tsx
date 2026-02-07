import { useId } from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const sizeMap = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
};

const textSizeMap = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const gradId = useId();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 512 512"
        className={cn(sizeMap[size], 'flex-shrink-0')}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {/* Rounded square background */}
        <rect width="512" height="512" rx="96" ry="96" fill={`url(#${gradId})`} />
        {/* Document icon */}
        <path
          d="M160 96h128l80 80v240c0 17.7-14.3 32-32 32H160c-17.7 0-32-14.3-32-32V128c0-17.7 14.3-32 32-32z"
          fill="white"
          fillOpacity="0.95"
        />
        {/* Folded corner */}
        <path
          d="M288 96v48c0 17.7 14.3 32 32 32h48L288 96z"
          fill="white"
          fillOpacity="0.7"
        />
        {/* CV text */}
        <text
          x="196"
          y="340"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="140"
          fontWeight="700"
          fill={`url(#${gradId})`}
        >
          CV
        </text>
      </svg>
      {showText && (
        <span className={cn('font-bold', textSizeMap[size])}>CVeetje</span>
      )}
    </div>
  );
}

export function LogoIcon({ className, size = 'md' }: Omit<LogoProps, 'showText'>) {
  return <Logo className={className} size={size} showText={false} />;
}
