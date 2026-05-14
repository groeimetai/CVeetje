# Firebase — `src/lib/firebase/`

Firebase Auth + Firestore + Storage. Client + Admin SDK.

## Files

| File | Exports |
|---|---|
| `admin.ts` | `getAdminAuth()`, `getAdminDb()`, `getAdminStorage()` — singleton pattern. Firestore `settings()` idempotent via `initializeFirestore` (zie commit `b2f23d4`). |
| `admin-utils.ts` | `verifyAdminRequest`, `getUserIdFromToken`, `setUserRole`, `disableUser`, `enableUser`, `getAllUsers`, `getUserById`, `updateUserCredits`, `deleteUser`, `getAllCVs`, `getAdminCVFull`, `deleteAdminCV`, `setupInitialAdmin` |
| `config.ts` | Firebase client config |
| `auth.ts` | Client-side auth helpers (`signIn`, `signUp`, OAuth, etc.) |
| `firestore.ts` | Client-side Firestore CRUD helpers (CVs, profiles, templates, transactions) |

## Auth patterns

### Client
- `useAuth()` van `src/components/auth/auth-context.tsx`
- Token in cookie `firebase-token` (auto-managed)
- OAuth providers via `firebase/auth.ts`

### Server
- Verify via `getAdminAuth().verifyIdToken()` van cookie of `Authorization: Bearer` header
- Admin verify via `verifyAdminRequest()` (custom claims **eerst**, Firestore role fallback)
- Impersonation-aware: `getEffectiveUserId(request)` uit `src/lib/auth/impersonation.ts`

## Impersonation

`src/lib/auth/impersonation.ts`:
- `getEffectiveUserId(request)` — leest impersonation cookie als ingelogde user admin is
- `IMPERSONATE_COOKIE_NAME` — cookie name constant

API: `POST /api/admin/impersonate` (zet/clear cookie).
Banner UI: `src/components/admin/impersonation-banner.tsx`.

## Admin checks

```
verifyAdminRequest(request)
  → check custom claims (Firebase Auth)
  → fallback: read user doc → role check
```

**Niet alleen vertrouwen op `useAuth().isAdmin`** voor security-critical handelingen — server-side verify altijd.

## Firestore collecties

Top-level:
- `users/{uid}` — profile, encrypted API keys, credits, role (sensitive fields admin-SDK-only)
- `globalTemplates/{templateId}` — admin-managed (auth-read, admin-write)
- `jobs/{jobSlug}` — public read-only cache
- `feedback/{feedbackId}` — feedback (met `githubIssueNumber`)
- `kanban_boards/{boardId}` — admin kanban boards
- `kanban_cards/{cardId}` — kanban cards (denormalized `boardId`)

Subcollections onder `users/{uid}`:
- `transactions/{txId}` — credit purchase/usage (admin-SDK-only, immutable)
- `cvs/{cvId}` — generated CVs
  - `cvs/{cvId}/disputes/{disputeId}` — disputes per CV
- `profiles/{profileId}` — saved LinkedIn-parsed profiles
- `applications/{applicationId}` — applications tracker (admin-SDK-create, owner-update op `status`/`notes`)
- `templates/{templateId}` — user-uploaded DOCX templates

Rules: `firestore.rules` (root). Indexes: `firestore.indexes.json`.

## Middleware

`src/middleware.ts`:
- Locale prefixing (nl/en) via next-intl
- Dashboard route guards
- Auth redirects (login → dashboard / dashboard → login)

## Belangrijke patronen

- API keys: AES-256 encrypted in `users/{uid}` via `src/lib/encryption.ts` (`encrypt`/`decrypt`)
- Sensitive fields op user doc: alleen Admin SDK kan schrijven
- Transactions: append-only, never updated/deleted
- Custom claims worden gepushed via `setUserRole` — sneller dan Firestore role lookup
