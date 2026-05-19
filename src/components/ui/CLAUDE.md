# UI primitives — `src/components/ui/`

shadcn-stijl primitives, dunne wrappers rond Radix UI. Configuratie in `components.json` (repo root).

## Beschikbare primitives

`accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `form`, `input`, `label`, `logo`, `progress`, `select`, `separator`, `sheet`, `slider`, `sonner` (toaster), `switch`, `table`, `tabs`, `textarea`.

**Geen** `Checkbox` component — gebruik native `<input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input" />` zoals in `profile-input.tsx`, `cv-wizard.tsx`, `required-items-selector.tsx`.

## Patterns

- **Niet zelf rollen.** Voeg primitives toe via de shadcn CLI of kopieer een bestaand component als template. Variants gebruiken `class-variance-authority` (`cva`) — zie `button.tsx`.
- **Tailwind utility classes** voor alle styling — geen aparte CSS files.
- **`'use client'`** bovenaan bij elke primitive die Radix gebruikt (vrijwel allemaal).
- **`cn()` helper** voor className-merge uit `@/lib/utils`.
- **`asChild` prop** voor composition met `<Slot>` van Radix — gebruikt in `Button`, `DropdownMenuItem`, enz.

## Nieuwe primitive toevoegen

1. Kopieer een vergelijkbare primitive (bijv. `dialog.tsx` voor modals) als startpunt.
2. Wrap de Radix `*Primitive` exports met `cn()` + `cva` variants.
3. Houd de API consistent met shadcn — kijk op [ui.shadcn.com](https://ui.shadcn.com) voor de canonieke vorm vóór je iets eigens verzint.
4. Geen eigen state management — primitives zijn dom.
