# /audit-auth

Lijst alle API-routes in `src/app/api/*` die nog de handmatige 8-liner Firebase token-check gebruiken. Identificeer migratiekandidaten voor een toekomstige `withUser()`-helper.

## Doel

Volgens recent onderzoek herhalen ~51 routes letterlijk dezelfde 8 regels:

```typescript
const cookieStore = await cookies();
const token = cookieStore.get('firebase-token')?.value ||
  request.headers.get('Authorization')?.replace('Bearer ', '');
if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const decodedToken = await getAdminAuth().verifyIdToken(token);
const userId = decodedToken.uid;
```

Plus dubbele admin-check codepaths (`admin-utils.ts:40` vs `impersonation.ts:33`). Deze command vindt alle voorkomens en groepeert ze zodat een gefaseerde migratie naar `withUser()` mogelijk is.

## Stappen

1. **Grep** alle bestanden onder `src/app/api/` op patroon `firebase-token` of `verifyIdToken`. Lijst de matchende file-paden.

2. **Voor elke match: lees ~20 regels rond de match** en classificeer:
   - **Standard auth** (cookie + header fallback, `verifyIdToken`, geen extra checks)
   - **Auth + admin-check** (vereist `decodedToken.admin === true` of Firestore role-fallback)
   - **Auth + impersonation** (gebruikt `getEffectiveUserId()` uit `src/lib/auth/impersonation.ts`)
   - **Auth + rate-limit** (heeft een rate-limiter wrapper)
   - **Auth + custom credit-check** (heeft eigen credit-deductie inline i.p.v. via `resolveProvider()`)

3. **Groepeer per route-tree**:
   - `/api/cv/*`
   - `/api/profile/*`
   - `/api/templates/*`
   - `/api/settings/*`
   - `/api/credits/*`
   - `/api/admin/*`
   - `/api/mollie/*`
   - `/api/auth/*`
   - andere

4. **Check** of `src/lib/auth/with-user.ts` al bestaat. Zo ja: lijst welke routes al naar de helper gemigreerd zijn (gebruiken `withUser(...)`) en welke nog niet.

5. **Rapporteer** als tabel + samenvatting:

   | Route-tree | # routes | Standard | Admin | Impersonation | Migrated |
   |---|---|---|---|---|---|
   | `/api/cv/*` | 8 | 6 | 0 | 0 | 0 |
   | ... | ... | ... | ... | ... | ... |

   Plus een lijst van "afwijkende" routes — die met custom credit-checks of rate-limiters die niet zomaar in `withUser()` passen. Die vereisen handmatig werk.

6. **Stel migratiebatches voor** (één PR per groep, beginnend bij de simpelste — meestal `/api/profile/*` of `/api/settings/*` met weinig edge cases).

## Regels

- **Lees-only.** Deze command wijzigt geen routes.
- **Tel geen `route.ts` files die geen auth doen** (bv. publieke endpoints zoals `/api/health` als die bestaat).
- **Bij twijfel over classificatie: markeer als "review needed"** in plaats van te gokken.
- **Vermeld expliciet** welke routes impersonation-aware MOETEN worden bij migratie naar `withUser()` (anders breekt de admin-impersonation feature in `/api/admin/*`).
