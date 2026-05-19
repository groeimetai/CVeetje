# Kanban — `src/components/admin/kanban/`

Admin-only project board (Firestore `kanban_boards` + `kanban_cards`). DnD via `@dnd-kit`.

| Bestand | Doel |
|---|---|
| `kanban-board.tsx` | Hoofdcomponent. Beheert het `DndContext`, fetcht board+kaarten, dispatch reorder-mutaties. |
| `kanban-column.tsx` | Eén kolom (status). Wraps `SortableContext` voor de kaarten. |
| `kanban-card.tsx` | Sortable kaart. `useSortable` + drag-handle pattern. |
| `card-dialog.tsx` | Modal voor card create/edit (titel, beschrijving, labels, assignee). |
| `board-list.tsx` | Overview van alle boards in de admin sectie. |
| `board-settings-dialog.tsx` | Kolommen-config + delete-board. |

## Patterns

- **Reorder API**: `POST /api/admin/kanban/cards/reorder` met `{ cardId, fromColumn, toColumn, newIndex }`. Server schrijft `order` (fractional index of integer) zodat we niet alle kaarten hoeven te herschrijven bij elke move.
- **Optimistic UI**: pas state direct aan op drag-end, rol terug bij API-error.
- **Admin-only**: routes onder `/api/admin/kanban/*` verifiëren via `verifyAdminRequest()` (zie `src/lib/firebase/CLAUDE.md`). Frontend rendert via `useAuth().isAdmin`, maar dat is alleen UX — server-side blijft de autoriteit.
- **Audit-log**: card-acties die persoonsdata raken (assignment naar user) loggen via `logAdminAction()` uit `src/lib/admin/CLAUDE.md`.

## Nieuwe kolom-status

1. Update Firestore (`kanban_boards/<id>.columns` array — bevat `{ id, label, order }`).
2. Geen frontend-changes nodig — kolommen worden data-driven gerendered. Maar check `card-dialog.tsx` of er hardcoded status-validatie staat.
