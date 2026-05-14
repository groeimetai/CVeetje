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
| Character-based chat | `/api/cv/chat` | `chargePlatformCredits()` na operatie |

**Single source of truth voor credits + provider resolution: `src/lib/ai/platform-provider.ts`** — zie `src/lib/ai/CLAUDE.md`.

## Reset flow

`/api/credits/check-reset` — idempotent. Triggers maandelijkse reset van free tier.

## Related

- Mollie payments: `src/lib/mollie/client.ts` + `src/app/api/mollie/*`
- API key encryption: `src/lib/encryption.ts` (AES-256)
- Platform config: `src/lib/ai/platform-config.ts`
