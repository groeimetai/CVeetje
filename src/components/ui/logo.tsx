import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const sizeClass: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'cv-logo--sm',
  md: '',
  lg: 'cv-logo--lg',
  xl: 'cv-logo--lg',
};

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  return (
    <div className={cn('cv-logo', sizeClass[size], className)} aria-label="Cveetje">
      <span className="cv-logo__mark" aria-hidden="true">cv</span>
      {showText && (
        <span className="cv-logo__text">
          Cv<em>eetje</em>
        </span>
      )}
    </div>
  );
}

export function LogoIcon({ className, size = 'md' }: Omit<LogoProps, 'showText'>) {
  return <Logo className={className} size={size} showText={false} />;
}
