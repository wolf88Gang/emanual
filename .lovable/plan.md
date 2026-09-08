# Close out the platform console for launch

The console rebuild is done: sidebar navigation, organization list and detail, subscriptions, payments, requests, metrics and system checks all exist and open. Three items remain before launch.

## 1. Real system status on the Console

The Console tile currently shows a hardcoded "Operational" label. It will instead run the same read-only checks the System page runs (database, administrator session, file storage) and show one of: All systems responding / Issues detected (with the count), coloured accordingly, still linking to the System page.

## 2. Signed-in click-through review

Sign in as a platform administrator and walk every destination and control: Console tiles and quick actions, Clients (search, Open organization), organization detail, plan editor (save and reopen), Subscriptions, Payments, Requests (status changes), Metrics, System (re-run checks). Anything that does not respond gets fixed in the same pass. Findings reported with what was clicked and what happened.

## 3. Regression tests

Add small tests covering the pieces that silently broke before:
- the organization aggregation helper (canonical subscription pick, member and site grouping, money formatting)
- the route registry entries for every platform destination

## Technical notes

- New shared hook for the three read-only checks (`organizations` head count, `auth.getSession`, `storage.listBuckets`), consumed by both `PlatformSystem.tsx` and the Console tile in `PlatformAdmin.tsx`, so there is one source of truth.
- Tests target `src/lib/platformAdmin.ts` (`canonicalSubscription`, `fetchPlatformOrganizations` shaping with a mocked client, `formatMoney` for USD and CRC) plus an extension of `src/test/routeRegistry.test.ts`.
- Browser pass uses a minted admin session against the local dev server; no schema or policy changes are planned.
- Verification: `bunx tsgo --noEmit`, `bunx vitest run`, `bun run build`.

## Out of scope

Making the `photos` bucket private (evidence records store public URLs; switching to signed URLs is a separate change).
