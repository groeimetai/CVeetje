# Admin components — `src/components/admin/`

UI voor admin-only routes onder `(dashboard)/admin/`.

## Sections

| Bestand | Doel |
|---|---|
| `cvs-section.tsx` | All-users CV inbox (read-only, delete) |
| `disputes-section.tsx` | Disputes inbox + manual resolution |
| `emails-section.tsx` | Outbound email log |
| `feedback-section.tsx` | Feedback inbox (synced met GitHub issues) |
| `users-table.tsx` | User management (role, credits, disable/enable, templates) |
| `profiles-section.tsx` | Per-user saved LinkedIn profiles |
| `platform-config-section.tsx` | Platform AI config (model, costs) |
| `global-templates-section.tsx` | Global DOCX templates beheren |
| `impersonation-banner.tsx` | Banner wanneer admin als andere user acteert |
| `admin-cv-dialog.tsx`, `email-detail-dialog.tsx`, `feedback-detail-dialog.tsx`, `profile-detail-dialog.tsx`, `user-detail-dialog.tsx` | Detail dialogs |

## Kanban (`src/components/admin/kanban/`)

`@dnd-kit`-powered task board. Top-level Firestore collecties `kanban_boards` + `kanban_cards` (denormalized `boardId`).

| Bestand | Doel |
|---|---|
| `kanban-board.tsx` | Hoofd-board component met DnD context |
| `kanban-column.tsx` | Kolom (status) met droppable area |
| `kanban-card.tsx` | Draggable kaart |
| `card-dialog.tsx` | Card-edit dialog |
| `board-list.tsx` | Lijst van boards (sidebar) |
| `board-settings-dialog.tsx` | Board settings |

## Belangrijke patronen

- Impersonation: `useAuth()` levert `effectiveUserId`, `startImpersonation`, `stopImpersonation`. Banner gebruikt deze. API: `POST /api/admin/impersonate` (zet cookie `IMPERSONATE_COOKIE_NAME`).
- Admin checks gebeuren server-side via `verifyAdminRequest()` (zie `src/lib/firebase/CLAUDE.md`). Niet alleen vertrouwen op `useAuth().isAdmin` voor security-critical handelingen.
- Kanban drag-and-drop persisteert via `/api/admin/kanban/cards/reorder` (bulk update om race conditions te voorkomen).
