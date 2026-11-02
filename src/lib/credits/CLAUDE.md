# Credits — `src/lib/credits/`

Free monthly credits + purchased credits via Mollie. **1 credit per PDF download**.

## File

| File | Exports |
|---|---|
| `manager.ts` | `checkAndResetMonthlyCredits`, `hasEnoughCredits`, `getDaysUntilReset` |

## Modes

- **BYOK users** — pay 0 credits voor AI operaties (eigen API key)
- **Platform users** — per-operatie kosten in `src/lib/ai/platform-config.ts` (`PlatformOperation`, `PLATFORM_CREDIT_COSTS`)
- **Character-based billing** (cv-chat) — via `chargePlatformCredits()` apart aanroepen

## Credit-aftrek punten

| Operatie | Waar | Methode |
|---|---|---|
| PDF download | `/api/cv/[id]/pdf` | 1 credit |
| AI operaties (platform mode) | overal via `resolveProvider({ userId, operation })` | per-op cost |
| Character-based chat | `/api/cv/chat` | `chargePlatformCredits()` vóór de stream; wat al betaald is staat server-side in `users/{uid}/chatSessions/{chatId}` (client-waarde wordt genegeerd) |
| Template-fill refill | `/api/templates/[id]/fill?skipCredit=true` | Alleen gratis met receipt `users/{uid}/templateFills/{templateId}` (<24u, max 25) |
| Mollie bijschrijving | `/api/mollie/webhook` | Transactie met `create()` op `processedPayments/{paymentId}` (idempotent) |

**Single source of truth voor credits + provider resolution: `src/lib/ai/platform-provider.ts`** — zie `src/lib/ai/CLAUDE.md`.

## Security-invarianten (zie `docs/security/2026-11-security-audit.md`)

- Aftrek is **altijd transactioneel** (`deductPlatformCredits` leest het saldo vers in `runTransaction`, nooit < 0). Nooit check-then-deduct op een eerder gelezen user-doc.
- **Vertrouw nooit** credit-gerelateerde waarden uit request-body/query (`chargedCredits`, `skipCredit`, `paid`) of uit client-schrijfbare Firestore-velden.
- Reken **vóór** het AI-werk af en refund bij een fout (`refundPlatformCredits` → terug naar de bucket waaruit afgeschreven is).
- Starter-credits (`/api/auth/init-user`) alleen na server-side reCAPTCHA.

## Reset flow

`/api/credits/check-reset` — idempotent. Triggers maandelijkse reset van free tier.

## Related

- Mollie payments: `src/lib/mollie/client.ts` + `src/app/api/mollie/*`
- API key encryption: `src/lib/encryption.ts` (AES-256)
- Platform config: `src/lib/ai/platform-config.ts`
