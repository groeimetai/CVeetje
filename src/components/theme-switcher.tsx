'use client';

import { Moon, Sun, Monitor, Palette, Type, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import {
  useAppearance,
  PALETTES,
  DENSITIES,
  FONT_PAIRS,
  type PaletteName,
  type Density,
  type FontPair,
} from '@/components/theme-provider';

const PALETTE_LABEL: Record<PaletteName, string> = {
  clay: 'Clay',
  forest: 'Forest',
  ink: 'Ink',
  marigold: 'Marigold',
};
const PALETTE_DOT: Record<PaletteName, string> = {
  clay: '#c2410c',
  forest: '#1f3a2e',
  ink: '#1d3eb8',
  marigold: '#d18b00',
};
const DENSITY_LABEL: Record<Density, string> = {
  compact: 'Compact',
  comfortable: 'Comfortable',
  spacious: 'Spacious',
};
const FONTPAIR_LABEL: Record<FontPair, string> = {
  editorial: 'Editorial',
  grotesk: 'Grotesk',
  newspaper: 'Newspaper',
};

export function ThemeSwitcher() {
  const t = useTranslations('theme');
  const {
    theme,
    palette,
    density,
    fontpair,
    setTheme,
    setPalette,
    setDensity,
    setFontpair,
  } = useAppearance();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 relative">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t('toggle')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('toggle')}</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={theme === 'light' ? 'bg-accent text-accent-foreground' : ''}
        >
          <Sun className="mr-2 h-4 w-4" />
          {t('light')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={theme === 'dark' ? 'bg-accent text-accent-foreground' : ''}
        >
          <Moon className="mr-2 h-4 w-4" />
          {t('dark')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={theme === 'system' ? 'bg-accent text-accent-foreground' : ''}
        >
          <Monitor className="mr-2 h-4 w-4" />
          {t('system')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" /> Palette
        </DropdownMenuLabel>
        {PALETTES.map((p) => (
          <DropdownMenuItem
            key={p}
            onClick={() => setPalette(p)}
            className={palette === p ? 'bg-accent text-accent-foreground' : ''}
          >
            <span
              aria-hidden="true"
              className="mr-2 inline-block size-3 rounded-full ring-1 ring-border"
              style={{ background: PALETTE_DOT[p] }}
            />
            {PALETTE_LABEL[p]}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Maximize2 className="h-4 w-4" /> Density
        </DropdownMenuLabel>
        {DENSITIES.map((d) => (
          <DropdownMenuItem
            key={d}
            onClick={() => setDensity(d)}
            className={density === d ? 'bg-accent text-accent-foreground' : ''}
          >
            {DENSITY_LABEL[d]}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Type className="h-4 w-4" /> Font pair
        </DropdownMenuLabel>
        {FONT_PAIRS.map((f) => (
          <DropdownMenuItem
            key={f}
            onClick={() => setFontpair(f)}
            className={fontpair === f ? 'bg-accent text-accent-foreground' : ''}
          >
            {FONTPAIR_LABEL[f]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
