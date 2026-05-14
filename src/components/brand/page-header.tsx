import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  /** Right-aligned actions (buttons, switchers). */
  actions?: ReactNode;
}

/**
 * Page header pattern used inside the dashboard.
 * Renders an editorial-style title (Instrument Serif) with an optional eyebrow
 * + subtitle + right-aligned actions row.
 */
export function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__main">
        {eyebrow && <span className="section-header__eyebrow">{eyebrow}</span>}
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
