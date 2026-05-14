# Hooks — `src/hooks/`

React hooks voor stateful client-side logica.

| Hook | Doel |
|---|---|
| `use-cv-chat.ts` | `useCVChat()` — wraps `useChat()` van `@ai-sdk/react`. Handles tool-calls die CV content of design tokens muteren. |
| `use-template-chat.ts` | Idem voor DOCX-template editing. |
| `use-wizard-persistence.ts` | localStorage draft management. Key: `cveetje_wizard_draft`. Expiry: 24h. Exports `WizardStep` type. |
| `use-profiles.ts` | Saved-profile fetching helper. |

## Patterns

- **Wizard state**: alleen via `use-wizard-persistence.ts` — anders raakt draft state out of sync met localStorage
- **Nieuwe wizard step**: extend `WizardStep` type in `use-wizard-persistence.ts`, dan render-tak in `cv-wizard.tsx`
- **Chat tool-calls**: definitions in `src/types/chat.ts` (`CVChatToolName` + param types). Server-side handler in `src/app/api/cv/chat/route.ts`.
