import { cn } from '@/lib/utils';

export type CvThumbLayout = 'split' | 'editorial' | 'minimal';

interface CvThumbProps {
  layout?: CvThumbLayout;
  name?: string;
  role?: string;
  accent?: string;
  primary?: string;
  paper?: string;
  className?: string;
}

export function CvThumb({
  layout = 'split',
  name = 'John Doe',
  role = 'Senior Designer',
  accent = 'var(--accent)',
  primary = 'var(--primary)',
  paper = 'var(--card)',
  className,
}: CvThumbProps) {
  if (layout === 'split') {
    return (
      <div className={cn('cv-thumb', className)} style={{ background: paper }}>
        <div className="cv-thumb__sidebar" style={{ background: primary }}>
          <div className="cv-thumb__avatar" />
          <div className="cv-thumb__sb-name">{name}</div>
          <div className="cv-thumb__sb-role">{role}</div>
          <div className="cv-thumb__sb-line" />
          <div className="cv-thumb__sb-bar" />
          <div className="cv-thumb__sb-bar" style={{ width: '60%' }} />
          <div className="cv-thumb__sb-bar" style={{ width: '80%' }} />
          <div className="cv-thumb__sb-line" />
          <div className="cv-thumb__sb-bar" style={{ width: '70%' }} />
          <div className="cv-thumb__sb-bar" style={{ width: '50%' }} />
        </div>
        <div className="cv-thumb__main">
          <div className="cv-thumb__h" style={{ color: accent }}>OVER MIJ</div>
          <div className="cv-thumb__line" />
          <div className="cv-thumb__line" />
          <div className="cv-thumb__line" style={{ width: '70%' }} />
          <div className="cv-thumb__h" style={{ color: accent, marginTop: 6 }}>ERVARING</div>
          <div className="cv-thumb__line" style={{ width: '40%', background: 'var(--ink)' }} />
          <div className="cv-thumb__line" />
          <div className="cv-thumb__line" style={{ width: '80%' }} />
          <div className="cv-thumb__line" style={{ width: '40%', background: 'var(--ink)' }} />
          <div className="cv-thumb__line" />
          <div className="cv-thumb__line" style={{ width: '60%' }} />
        </div>
      </div>
    );
  }

  if (layout === 'editorial') {
    return (
      <div className={cn('cv-thumb cv-thumb--ed', className)} style={{ background: paper }}>
        <div className="cv-thumb__ed-head">
          <div className="cv-thumb__ed-name" style={{ color: accent, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{name}</div>
          <div className="cv-thumb__ed-role">{role}</div>
        </div>
        <div style={{ height: 1, background: accent, margin: '6px 0' }} />
        <div className="cv-thumb__ed-cols">
          <div>
            <div className="cv-thumb__h" style={{ color: accent }}>01 PROFIEL</div>
            <div className="cv-thumb__line" />
            <div className="cv-thumb__line" />
            <div className="cv-thumb__line" style={{ width: '60%' }} />
            <div className="cv-thumb__h" style={{ color: accent, marginTop: 6 }}>02 ERVARING</div>
            <div className="cv-thumb__line" style={{ width: '50%', background: 'var(--ink)' }} />
            <div className="cv-thumb__line" />
            <div className="cv-thumb__line" style={{ width: '70%' }} />
          </div>
          <div>
            <div className="cv-thumb__h" style={{ color: accent }}>03 SKILLS</div>
            <div className="cv-thumb__chips">
              <div className="cv-thumb__chip" />
              <div className="cv-thumb__chip" style={{ width: 20 }} />
              <div className="cv-thumb__chip" />
              <div className="cv-thumb__chip" style={{ width: 18 }} />
            </div>
            <div className="cv-thumb__h" style={{ color: accent, marginTop: 6 }}>04 CONTACT</div>
            <div className="cv-thumb__line" style={{ width: '70%' }} />
            <div className="cv-thumb__line" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  // minimal
  return (
    <div className={cn('cv-thumb cv-thumb--min', className)} style={{ background: paper }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div className="cv-thumb__min-name">{name}</div>
        <div className="cv-thumb__min-role">{role}</div>
      </div>
      <div style={{ height: 1, background: 'var(--ink)', opacity: 0.2, margin: '6px 0' }} />
      <div className="cv-thumb__h" style={{ color: accent }}>ERVARING</div>
      <div className="cv-thumb__line" style={{ width: '50%', background: 'var(--ink)' }} />
      <div className="cv-thumb__line" />
      <div className="cv-thumb__line" style={{ width: '80%' }} />
      <div className="cv-thumb__line" style={{ width: '60%' }} />
      <div className="cv-thumb__h" style={{ color: accent, marginTop: 4 }}>OPLEIDING</div>
      <div className="cv-thumb__line" />
      <div className="cv-thumb__line" style={{ width: '50%' }} />
    </div>
  );
}
