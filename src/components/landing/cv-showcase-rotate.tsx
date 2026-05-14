'use client';

import { useState } from 'react';
import { CvThumb, type CvThumbLayout } from '@/components/brand/cv-thumb';

interface ShowcaseStyle {
  id: string;
  label: string;
  layout: CvThumbLayout;
  accent: string;
  primary: string;
  dot: string;
}

const STYLES: ShowcaseStyle[] = [
  { id: 'minimal', label: 'Minimal', layout: 'minimal', accent: 'var(--ink)', primary: 'var(--ink)', dot: 'var(--ink)' },
  { id: 'editorial', label: 'Editorial', layout: 'editorial', accent: 'var(--accent)', primary: 'var(--primary)', dot: 'var(--accent)' },
  { id: 'bold', label: 'Bold', layout: 'split', accent: 'var(--accent)', primary: 'var(--primary)', dot: 'var(--primary)' },
];

export function CvShowcaseRotate() {
  const [active, setActive] = useState(1);
  return (
    <div className="showcase__right">
      {STYLES.map((s, i) => {
        const pos = (i - active + 3) % 3;
        return (
          <div key={s.id} className="showcase__cv" data-pos={pos}>
            <CvThumb layout={s.layout} accent={s.accent} primary={s.primary} name="Eva Rivera" role="Senior Designer" />
          </div>
        );
      })}
      <div className="showcase__styler">
        {STYLES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className="showcase__styler-dot"
            data-active={i === active ? 'true' : undefined}
            data-label={s.label}
            style={{ background: s.dot }}
            onClick={() => setActive(i)}
            aria-label={s.label}
          />
        ))}
      </div>
    </div>
  );
}
