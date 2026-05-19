# Admin — `src/lib/admin/`

AVG art. 32 audit-trail voor admin-acties die persoonsdata raken.

| Bestand | Doel |
|---|---|
| `audit-log.ts` | `logAdminAction(entry)` schrijft naar Firestore `admin_audit_log` (collectie aan root). `AdminAction` union dekt de toegestane actie-types. `extractRequestContext(request)` haalt ip+userAgent uit een `NextRequest`. |

## Patroon — wanneer aanroepen

Voor **élke admin-actie die persoonsdata raakt of muteert**: roep `logAdminAction()` aan **ná** de mutatie. Bijvoorbeeld:

```ts
// in src/app/api/admin/users/[userId]/credits/route.ts
await adminDb.collection('users').doc(userId).update({ credits: newAmount });
logAdminAction({
  adminId,
  action: 'user-credits-adjusted',
  targetUserId: userId,
  details: { oldAmount, newAmount, reason },
  ...extractRequestContext(request),
});
```

`logAdminAction` is **fire-and-forget** (geen await nodig in de hot path) — `void` return. Loggen mag de respons niet blokkeren of laten falen.

## Firestore Security Rules

`admin_audit_log` is:
- **read-only voor admins** (custom claim `admin: true`)
- **immutable** — geen update/delete vanuit clients of admin SDK na write
- **server-side only schrijfbaar** — Admin SDK omzeilt rules, dat is OK; client-side direct schrijven is uitgesloten

Zie `firestore.rules` in repo root voor de exacte rule.

## Wat NIET loggen

- Read-only admin queries (listing, opening detail-views) — alleen mutaties.
- Eigen acties van de user (signup, CV-generatie) — die staan elders (telemetry, cv-doc subcollections).
- Impersonation-start zelf — die wordt apart gelogd in `src/lib/auth/impersonation.ts` (zie `src/lib/firebase/CLAUDE.md`).

## Nieuwe AdminAction toevoegen

1. Extend `AdminAction` union in `audit-log.ts`.
2. Roep `logAdminAction()` aan in de relevante `/api/admin/*` route, ná de mutatie.
3. Check dat de details die je meegeeft geen onnodige PII bevatten (logs zijn 5-jaar bewaard volgens retention-beleid in `docs/compliance/`).
