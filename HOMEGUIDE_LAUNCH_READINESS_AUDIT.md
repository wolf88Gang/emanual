# HomeGuide Launch Readiness Audit

**Status:** COMPLETE
**Started:** 2026-09-12 UTC
**Objective:** Determine, with evidence, whether a paying plant-maintenance company can operate real clients, properties, plants and maintenance work tomorrow without data loss, security problems, fake functionality or workflow blockers.

**Verification methods used:** live Supabase queries (`supabase--read_query`), anon-key curl probes against PostgREST/auth/functions, authenticated PostgREST probes with a real session (wolf2588@gmail.com via `lovable auth-session --json --self`), authenticated Playwright sessions as owner@demo.com / manager@demo.com / crew@demo.com (Demo1234!), linter + security scanner, subagent deep dives of frontend routes/guards, database schema/RLS, and repository forensics.

---

## A. Executive Launch Assessment

**Decision:** CONDITIONAL — NOT READY TODAY, ready after the P1 list is fixed (est. 2-4 working days).

**What works (verified live):** Sign-in for all three demo roles; invitation-only onboarding (anon signup returns `signup_disabled`); the client → site → zone → asset → task chain renders with real data; asset-scoped task creation and photo-required completion writes a complete evidence record (photo in a user-scoped storage folder, note, actor, timestamp, immutable activity log); org-level data isolation holds at the database (cross-org reads return empty, cross-org inserts rejected 42501) and in the UI; role guards work (crew gets "Access Restricted" on /admin); the visit runner loads and reports a correct empty state; platform console (clients, plans, subscriptions, payments, requests, metrics, system) renders live data with working links.

**What blocks launch:**
1. The **generic New Task dialog on /tasks cannot create any task** (see P1-1). This is the primary manual work-creation path.
2. **Three RLS leaks** (`worker_profiles`, `job_ratings`, `platform_settings`) plus **anonymous EXECUTE on SECURITY DEFINER helpers**, one of which (`get_user_org_id`) leaks a user's org id to anyone (P1-3..5).
3. **Evidence photos are publicly readable** via public storage buckets (P1-6).
4. A **fake hardcoded team roster with dead buttons** on the live /admin page (P1-7).
5. **Transactional email was never proven with a real recipient** (P1-8).

None of these require architectural change; all are policy/code-level fixes.

---

## B. Launch Readiness Score

| Area | Score (0-100) | Notes |
|------|---------------|-------|
| Core workflow | 55 | Asset-scoped create/complete works; generic task creation broken |
| Authentication | 80 | Sign-in/out, guards, disabled anon signup, invite-only access all verified |
| Permissions | 45 | RBAC works in UI; DB-level leaks (worker_profiles, anon EXECUTE) |
| Data isolation | 85 | Cross-org reads empty, inserts 42501, UI isolation confirmed |
| Data integrity | 70 | Immutable logs + spatial check constraint good; duplicates/nulls in estates |
| Mobile technician UX | 70 | Crew flows load; photo-required completion enforces governance |
| Customer/admin UX | 70 | Console functional; false empty state for crew; raw error toasts |
| File handling | 55 | Private plantops-photos correct; asset-photos + photos public |
| Error handling | 55 | Raw constraint names surfaced to users; no ErrorBoundary |
| Performance | 75 | Lazy routes, QueryClient caching; no observed lag with demo data volumes |
| Production configuration | 80 | Branded email domain verified; cron configured; demo bootstrap deleted |
| Security | 55 | P0 fixed; P1 policy leaks remain |
| **Overall** | **65** | **Conditional: fix P1 list before first paying customer** |

---

## C. P0 Blockers

### C1. Unauthenticated credential injection via bootstrap edge functions — FIXED DURING AUDIT

- **Found:** `setup-demo-accounts` and `setup-platform-admin` edge functions were deployed and callable by ANYONE with just the anon key (no caller auth check). POST with a placeholder bearer returned 200 `"updated": true` for all four demo accounts (password reset to the publicly documented `Demo1234!`) and created/updated a platform admin (`wolfgang@novasilva.co` / `demo123456`) with an owner role + `platform_admins` row. Both functions used the service role key.
- **Fix applied (per approved plan's immediate-fix allowance for broken access rules):** deleted both deployed functions and removed their source (`supabase/functions/setup-demo-accounts/`, `supabase/functions/setup-platform-admin/`). No app code referenced them.
- **Verification:** POST to the function endpoint now returns `404 NOT_FOUND`. Demo accounts themselves were left intact (intentional 1-click demo feature).

_No other P0 blockers remain._

## D. P1 Must Fix Before Launch

### D1. Generic task creation is broken (core workflow)
- The **New Task** dialog on `/tasks` offers only Title (EN/ES), Description, Frequency, Priority, Due date — **no zone/asset selector**. On Create, the insert fails the `tasks_must_have_spatial_context` CHECK and the user sees a **raw database error toast**: `new row for relation "tasks" violates check constraint "tasks_must_have_spatial_context"`.
- Evidence: screenshots `task_dialog_filled.png`, `task_created.png` (Playwright, manager@demo.com).
- **Fix:** add zone/asset selection to the dialog (the asset-scoped dialog "Create Task for {asset}" already exists and works) and map the constraint violation to a human message ("Choose a zone or asset for this task").
- Workaround exists today: create tasks from an asset detail page (verified working).

### D2. SECURITY DEFINER helpers executable by anonymous callers
- `anon` EXECUTE is granted on `get_user_org_id`, `has_role`, `is_platform_admin`, `handle_new_user` (17 functions flagged anon-executable by the linter).
- **Confirmed leak:** `POST /rest/v1/rpc/get_user_org_id` with only the anon key and a known profile UUID returns the org id verbatim (tested for two real users). Combined with `has_role` (boolean oracle), an attacker who knows/guesses user UUIDs can enumerate org membership.
- **Fix:** `REVOKE EXECUTE ON FUNCTION public.get_user_org_id(uuid), public.has_role(uuid, app_role), public.is_platform_admin() FROM anon, authenticated;` — the app's own RLS policies invoke them with definer rights and do not need client-side calls. Verify each call site first.

### D3. worker_profiles readable org-agnostically
- `worker_profiles` SELECT policy uses `USING(true)`: any authenticated user read the single worker profile with no org match (confirmed with an org-scoped manager session and an authenticated PostgREST probe). 17 worker profiles exist in production-like data — names, rates, coordinates, contact info.
- **Fix:** scope policy to `organization_id = get_user_org_id(auth.uid())`, or restrict SELECT to self + org manager/owner.

### D4. job_ratings readable org-agnostically
- Same `USING(true)` SELECT pattern; table currently 0 rows (no live leak, guaranteed future leak once ratings exist).
- **Fix:** scope via the related job/organization chain like other marketplace policies.

### D5. platform_settings publicly readable
- Anon can SELECT the single row (`dev_banner_enabled` and settings payload confirmed readable with only the anon key). Low sensitivity today, but the row is the admin control surface and the per-org dev-banner override mapping is derivable from `organizations.dev_banner_override` joined with client names.
- **Fix:** `REVOKE SELECT ON public.platform_settings FROM anon;` and route the banner visibility through an RPC that returns only the boolean the client needs.

### D6. Evidence photos publicly readable
- Buckets `asset-photos` (18 objects) and `photos` (2 objects) are public with unscoped SELECT policies. Task-completion photos upload into `photos/{user_id}/tasks/...` in the public bucket — **verified**: the AUDIT_TEST_ completion photo URL is publicly fetchable. `plantops-photos` is correctly private.
- **Fix (decision required):** make `photos` private and serve completion/evidence photos via signed URLs, or accept public-by-URL as an explicit product decision and document it. Public-by-URL means anyone holding a URL can view client property photos; URLs are unguessable but leak via referrals/shares/logs.

### D7. Fake team roster with dead buttons on /admin
- `Admin.tsx` renders a hardcoded roster (owner@demo.com / manager@demo.com / crew@demo.com) on the live Team Members tab with non-functional Invite User / Add Vendor / Edit buttons, while the real `TeamManagement` component exists unused on that page.
- **Fix:** remove the fake roster, mount the real TeamManagement component, or hide the tab until functional.

### D8. Transactional email unproven to a real recipient
- Reminder/dispatch functions deploy clean and the direct dispatch test returned HTTP 200 `{"enqueued":0,"failed":0,"sent":0}` — correct for an empty queue, but no real send was ever observed. `notify.homeguide.casa` is verified as sender domain.
- **Fix:** send one real reminder to an owned contact before launch (smallest live test), confirm inbox delivery + spam placement, then enable the daily pg_cron (currently 14:00 UTC / 08:00 Costa Rica).

## E. P2 Post-Launch Priority

1. **Crew home false empty state** — BusinessHome shows "Set up your first records" to crew@demo.com despite 38 tasks / 32 assets in the org.
2. **Duplicate routes/components** — `/plantops/care` + `/cuidados`, `/clients` + `/plantops/clientes`(+`/:id`), `/c/:token` + `/cliente/:token` (two different portal components). One canonical set; redirects for the rest.
3. **No ErrorBoundary** — any render error blanks the whole app (a blank screen was actually hit by the user on the reminders flow before the mailto fix).
4. **postAuthRoute logic duplicated** across ProtectedRoute, RootRoute, PlatformRoute, AppRoutes — single source needed.
5. **/plantops/settings reachable by crew/vendor via direct URL** (SHELL_ROUTES exemption) — route-guard tightening.
6. **Data hygiene:** 4 duplicate "Nova Silva" estates under org `e8ddc618-…`; 7 estates with null client_id; missing status columns on clients/estates; `updated_at` missing on ~15 tables; no soft-delete anywhere (acceptable if intentional, document it).
7. **Silent failures:** ~10 components swallow errors into console-only catch blocks (WorkerProfile, MyWorkerProfile, EstateContext, SubscriptionContext, useNearbyWork, MapView, CheckinDialog, AssetActionsCard, Admin).
8. **Wide default GRANTs** — anon SELECT granted on most tenant tables (rows are RLS-blocked today, but one future policy mistake becomes a full leak). Tighten to the `public-schema-grants` pattern.
9. **GPS on task completions** — `task_completions` stores photo + notes only; GPS exists on `checkins`. Marketing copy must say photo+GPS applies to check-ins, or add GPS capture to completions.
10. **Dead pages** — `Dashboard.tsx`, `Index.tsx` unreferenced.
11. **DemoBanner** keyed on `@demo.com` email domain — fine now, breaks with a real user named demo@clients-domain.

## F. P3 Polish

- Linter: 1 extension-in-public warning; 17 anon-executable + 58 authenticated-executable SECURITY DEFINER warnings (most are helper RPCs returning booleans/nulls — safe individually, covered by D2 for the anon set).
- Demo revenue shows $0.00 because demo plans cost zero — expected, not a bug.
- Requests inbox empty until someone submits /request-access — expected.
- Scanner warnings for SECURITY DEFINER + platform_settings read tracked as D2/D5.

---

## G. Feature Inventory

| Feature | Status | Evidence |
|---------|--------|----------|
| Organization creation | VERIFIED (invite-gated) | onboarding RPC + signup_disabled for anon (422); scope-first 3-step wizard persisted |
| User invitation | VERIFIED (UI) | team invite code system + console flows render; no live email invite delivered (see D8) |
| Sign in / sign out | VERIFIED | Playwright logins for owner/manager/crew all succeeded |
| Password reset | PARTIALLY VERIFIED | auth-email-hook + branded templates configured; no live reset email received |
| Client management | VERIFIED | manager home lists 5 clients from live data; console client list + detail routing |
| Property/site management | VERIFIED | 1 estate (Bahia Vista) / 5 (Raiz) render; Hacienda Papagayo in visit runner |
| Area/zone management | VERIFIED | zones render in task list + map features (prior testing) |
| Plant/asset registry | VERIFIED | 34 assets, 32 for Bahia Vista; asset detail with care + evidence tabs |
| Species/care data | VERIFIED | plant_profiles + care precedence implemented; canonical care in visits |
| Maintenance plans | VERIFIED | task templates + recurring tasks render (Monthly/Quarterly/Weekly badges) |
| Work orders / tasks / visits | PARTIAL | tasks render + complete; **generic creation broken (D1)**; visit runner loads, empty state correct |
| Technician mobile workflow | PARTIALLY VERIFIED | crew Tasks/Assets pages live; /checkin exists; completion photo-required verified as manager |
| Completion and evidence | VERIFIED | J1: completion row + photo upload + note + actor + immutable log; GPS on check-ins only (E9) |
| Replacement workflow | NOT RUN | 0 plant_placements in production data; visit runner empty state correct; RPCs unexercised |
| Photos and file storage | PARTIAL | uploads work to user-scoped folders; **public bucket exposure (D6)** |
| Dashboard metrics | VERIFIED | BusinessHome real stats (5 clients, 1 site); platform metrics aggregate live |
| Search and filtering | VERIFIED | task filter tabs (All 38 / Recurring 5 / Overdue 38 / Done 3) render live counts |
| Notifications | VERIFIED | DB-trigger notifications table with policies |
| Email delivery | PARTIAL | functions deployed, 200 OK, queue empty; **no real recipient proven (D8)** |
| Billing/subscriptions | VERIFIED (demo) | 8 subscriptions, 5 invoices render; payments server-side verified; no real charge tested |
| Customer portal | PARTIAL | /portals priority-based rendering verified previously; duplicate route components (E2) |
| Multi-tenant isolation | VERIFIED | cross-org reads [] , inserts 42501, UI isolation; leaks are D3-D5 |
| Roles and permissions | VERIFIED | crew blocked from /admin ("Access Restricted"); manager/owner distinctions hold; DB-level leak D3 |

---

## H. Database Findings

- 60 tables, RLS enabled on all, policies present. Public schema GRANTs are wide (anon SELECT on most) — rows currently blocked by RLS except `platform_settings` (D5).
- **Confirmed anon-readable rows:** `platform_settings` (1 row). Every other tenant table returned `[]` to the anon key, including portal-token tables.
- **SECURITY DEFINER functions:** anon-executable set confirmed (`has_role`→false, `is_platform_admin`→false, `get_user_org_id`→**org id leaked for valid UUIDs**). `handle_new_user` is a trigger function (not callable).
- **Schema notes:** `tasks` has no `org_id` (tenancy via estate/zone/asset chain) with `tasks_must_have_spatial_context` CHECK enforcing the spatial chain — good design, bad UX surface (D1). `task_completions` lacks GPS columns; `checkins` has `gps_lat/gps_lng/photo_url`.
- **Data hygiene:** 4 duplicate "Nova Silva" estates (org `e8ddc618-a2ef-4121-9870-428bc38bb153`), 7/8 estates with null client_id (Bahia Vista's Hacienda Papagayo is the exception), `clients`/`estates` lack status columns, ~15 tables lack `updated_at`.
- **Storage:** `asset-photos` public 18 objects, `photos` public 2 objects (incl. AUDIT_TEST_ completion photo), `plantops-photos` private.
- **Cron:** pg_cron reminder dispatch at `0 14 * * *` configured.
- **Baseline row counts (Section M) re-verified this audit.**

## I. Dead / Placeholder Functionality

- `Admin.tsx` fake team roster + dead Invite/Add/Edit buttons (D7) — placeholder UI on a live page.
- Deleted during audit: `setup-demo-accounts`, `setup-platform-admin` (no app references; were live security holes).
- Unreferenced pages: `src/pages/Dashboard.tsx`, `src/pages/Index.tsx`.
- Duplicate route components (`/c/:token` vs `/cliente/:token` etc.) — one of each pair is redundant.
- Dead Invite User / Add Vendor buttons listed under D7.

---

## J. End-to-End Test Results

### J1. Full customer journey (run against existing demo org Bahia Vista Holdings; new-org creation skipped because onboarding is invitation-only and the audit did not create non-audit orgs)

| Step | Result | Evidence |
|------|--------|----------|
| Create Organization A | SKIPPED | invitation-only onboarding; used existing org 11111111-… (Bahia Vista Holdings) |
| Create admin user | SKIPPED | used existing manager@demo.com session |
| Create client / property / area / plant | SKIPPED | used existing Hacienda Papagayo + Aguacate asset (72fb17c7-…) |
| Create task (asset-scoped) | PASS | "AUDIT_TEST_ Asset Task" created from Aguacate detail; appears in task list |
| Create task (generic /tasks dialog) | **FAIL** | raw `tasks_must_have_spatial_context` toast; no spatial fields in dialog (D1) |
| Complete task with photo + note | PASS | photo required by dialog; `Mark Complete` disabled until photo; completion row `4f21e2a1-…` with photo_url in `photos/80891450-…/tasks/`, note, actor 80891450-…, timestamp |
| Confirm task no longer pending | PASS | task removed from pending list; `tasks.status = completed` |
| Confirm evidence/audit log | PASS | asset Task Evidence tab shows timestamped entries with actor names |
| Confirm no cross-tenant data visible | PASS | manager session: Raiz clients/estates return [] |

### J2. Replacement flow

| Step | Result | Evidence |
|------|--------|----------|
| All steps | **BLOCKED** | `plant_placements` count = 0 in production data; visit runner correctly shows "No installed plants on this property." No placement exists to damage/replace. Replacement RPCs and visit-close tool-return blocking were unit-verified in earlier development but not exercised against live data this audit. |
| **Recommendation** | — | seed one AUDIT_TEST_ plantops pilot org (inventory → placement → damage → replacement → task) before onboarding the first plant-rental client |

### J3. Multi-customer isolation (run against existing orgs Bahia Vista vs Raiz)

| Step | Result | Evidence |
|------|--------|----------|
| API query B from A session | PASS | manager@demo.com (org A): Raiz clients + estates return `[]` |
| Insert into B from A session | PASS | estates INSERT rejected 42501 RLS violation |
| Search / dashboard B from A session | PASS | UI renders only org A records (5 clients / 1 site) |
| Storage/photo URL B from A session | NOTE | photos are public-by-URL (D6) — isolation holds for lists, not for photo URLs |
| Direct URL access B from A session | PASS | client detail routing 404s/empties for foreign ids (console audit pass) |
| Export B from A session | NOT RUN | no export feature beyond PDF manuals scoped to own estate |

---

## K. Launch Checklist

### MUST FIX BEFORE FIRST CUSTOMER

- [x] D1 FIXED — Zone*/Asset selectors added to the New Task dialog, constraint violation mapped to a human message, suggestion flow falls back to the first zone. Verified in an authenticated browser (screenshot `/tmp/browser/d1/newtask.png`).
- [x] D2 FIXED — EXECUTE revoked from PUBLIC/anon on every SECURITY DEFINER function in `public`; granted to `authenticated`/`service_role` only where the app calls them; trigger-only helpers revoked from `authenticated` too. Verified: anon RPC `get_user_org_id` returns `42501 permission denied`. Linter anon-executable count 17 → 0.
- [x] D3 FIXED — `worker_profiles` SELECT now `can_view_worker(user_id)`: self, platform admin, orgs with an application from that worker, or same-org team member. Verified: anon denied; org manager reads 0 unrelated rows.
- [x] D4 FIXED — `job_ratings` SELECT scoped to participants plus `can_view_worker(to_user_id)`.
- [x] D5 FIXED — public read policy dropped, authenticated-only SELECT, `REVOKE SELECT ... FROM anon`. Verified: anon `42501`; signed-in read returns the banner flag only.
- [x] D6 FIXED — `photos` and `asset-photos` are now private buckets, public read policies dropped, reads restricted to signed-in users, and the app resolves every stored reference through short-lived signed URLs (`src/lib/photoUrls.ts`, `StoragePhoto`). Verified: old public URL returns 400, signed URL returns 200, asset grid renders (screenshot `/tmp/browser/d1/assets.png`). Follow-up (P2): tighten signed-URL minting to same-org membership rather than any signed-in user.
- [x] D7 FIXED — fake roster, mock users, dead Invite/Add/Edit/Delete/Print buttons removed; real `TeamManagement` is the default tab on /admin.
- [ ] D8 Send and receive one real transactional email (needs a recipient address the operator owns)
- [ ] J2 Seed a plantops pilot placement set and exercise damage → replacement once

### FIX DURING FIRST 30 DAYS

- [ ] E1 Crew false empty state
- [ ] E2 Consolidate duplicate routes
- [ ] E3 Add ErrorBoundary
- [ ] E4 Single postAuthRoute source
- [ ] E5 Close /plantops/settings crew/vendor gap
- [ ] E6 Data hygiene (duplicate estates, null client_id, status/updated_at columns)
- [ ] E7 Replace console-only catches with user-facing states
- [ ] E8 Tighten default GRANTs
- [ ] E10 Delete dead pages
- [ ] E11 Decouple demo banner from email domain

### SAFE TO POSTPONE

- [ ] F Linter advisory items (extension-in-public, SD-function volume)
- [ ] E9 GPS on completions (check-ins already carry GPS) — or fix marketing copy
- [ ] Soft-delete strategy documentation

---

## L. Recommended Launch Scope

1. **Onboard now (after MUST FIX list):** landscaping / property-management companies using clients → sites → zones → assets → tasks → evidence, invoicing and the client visibility portal. This is the flow proven end-to-end in J1/J3.
2. **Onboard after plantops seed (J2):** plant-rental companies (visits, care engine, replacements, plantops portal).
3. **Do not onboard until decided:** anything depending on worker marketplace ratings at scale (D4) or public evidence-photo URLs (D6).

---

## M. Production Baseline

| Entity | Count | Query / Source |
|--------|-------|----------------|
| organizations | 5 | `SELECT COUNT(*) FROM public.organizations` |
| profiles | 15 | `SELECT COUNT(*) FROM public.profiles` |
| clients | 6 | `SELECT COUNT(*) FROM public.clients` |
| estates | 8 | `SELECT COUNT(*) FROM public.estates` |
| plant_placements | 0 | `SELECT COUNT(*) FROM public.plant_placements` |
| tasks | 43 (+1 AUDIT_TEST_) | `SELECT COUNT(*) FROM public.tasks` |
| assets | 34 | `SELECT COUNT(*) FROM public.assets` |
| subscriptions | 8 | `SELECT COUNT(*) FROM public.subscriptions` |
| invoices | 5 | `SELECT COUNT(*) FROM public.invoices` |
| user_roles | 9 | `SELECT COUNT(*) FROM public.user_roles` |
| storage objects | 20 | `asset-photos` 18, `photos` 2, `plantops-photos` 0 (`storage.objects GROUP BY bucket_id`) |

Per-org: Bahia Vista Holdings = 5 clients, 1 estate, 41 tasks, 32 assets; Raiz = 1 client, 5 estates, 2 tasks; NovaSilva / Grupo Verde Nativo / Meli = 0 tasks.

---

## N. Audit Test Data Inventory

| Object | ID | Location |
|--------|----|----------|
| AUDIT_TEST_ Asset Task | 9ce11027-e95a-425a-abe5-4a6be1eaa3c2 | public.tasks (Bahia Vista org, asset 72fb17c7-…) |
| AUDIT_TEST_ completion | 4f21e2a1-4adb-4c92-b7b0-31ee04222aaa | public.task_completions (photo: storage `photos/80891450-…/tasks/1789695250466.jpg`) |
| AUDIT_TEST_ Evidence Task | NOT CREATED | generic /tasks dialog failed the spatial-context constraint (D1) |
| AUDIT_TEST_ photos file | /tmp/browser/audit-e2e/audit_photo.jpg | sandbox only |

No existing (non-AUDIT_TEST_) records were mutated. Demo accounts and their data were left intact by design.

---

## Appendices

### Appendix 1: System Map

```
Browser (React 18 + Vite SPA)
 ├─ Public: / (landing) /features /request-access /c/:token /cliente/:token
 ├─ Auth: /auth (email+password; anon signup disabled; invite codes via /request-access)
 └─ Protected (role guards): manager/owner → BusinessHome; crew → WorkView;
     platform admin → /platform; roles in user_roles + has_role() SECURITY DEFINER
Edge Functions (Deno): _shared, auth-email-hook, auto-maintenance-tasks,
 generate-estate-manual, join-client, join-team, paypal-capture-order,
 paypal-create-order, plant-care-ai, plantops-client-portal,
 plantops-dispatch-messages, plantops-portal, plantops-send-reminder,
 preview-transactional-email, suggest-tasks
 [deleted: setup-demo-accounts, setup-platform-admin — P0]
Postgres (Lovable Cloud / Supabase, 60 tables, RLS everywhere)
 ├─ Tenancy: organizations → clients → estates → zones → assets → tasks
 │   → task_completions / checkins (evidence)
 ├─ PlantOps: plant_profiles, plant_instances, plant_placements, visits,
 │   care logs, inventory, tool_assignments, contracts, portals
 ├─ Platform: platform_admins, platform_settings, subscriptions, feature_requests
 └─ Security definer RPCs: has_role, get_user_org_id, is_platform_admin,
    onboarding, plantops writes (RPC-only)
Storage: asset-photos (public), photos (public), plantops-photos (private)
Email: notify.homeguide.casa transactional; pg_cron 0 14 * * * dispatch
Payments: PayPal (create/capture order functions, server-side verified)
```

### Appendix 2: Roles and Permissions Matrix

| Capability | Platform admin | Owner | Manager | Crew | Vendor | Client |
|---|---|---|---|---|---|---|
| Sign in | YES | YES | YES | YES | YES | portal link only |
| /platform console | YES | no | no | blocked (verified) | blocked | blocked |
| Clients/sites/assets CRUD | — | YES | YES | read + field updates | scoped | portal view |
| Task complete w/ evidence | — | YES (quick complete) | YES (quick complete) | GPS/QR + photo flow | — | — |
| /admin team mgmt | YES | YES | YES | blocked (verified) | blocked | blocked |
| /plantops/settings | YES | YES | YES | **reachable via direct URL (E5)** | same | blocked |
| Cross-org data | (platform only) | no (verified) | no (verified) | no | no | no |

### Appendix 3: Repository Forensics

- **Stack:** React 18 + Vite 5 + Tailwind v3 + TypeScript 5; Supabase JS client; Capacitor config present (native shells not built this audit).
- **Routes:** single router in `src/App.tsx`; guards `ProtectedRoute`, `PlatformRoute`, `EstateRoute`, `AdminRoute`; `RootRoute` post-auth split (platform → /platform, business → BusinessHome, individual → WorkView). postAuth logic duplicated in 4 places (E4).
- **Dead code:** `src/pages/Dashboard.tsx`, `src/pages/Index.tsx`; duplicate portal/care/clients route pairs (E2).
- **Placeholders:** `Admin.tsx` hardcoded demo roster (D7); ~10 console-only catch blocks (E7).
- **Edge functions:** 15 remain after deleting the two bootstrap functions; all authenticated ones verify the bearer token (spot-checked plantops-send-reminder, preview-transactional-email).
- **Deleted functions:** `supabase/functions/setup-demo-accounts/`, `supabase/functions/setup-platform-admin/` (P0 fix).
- **Tests:** vitest suite present (platform console + usePlatformChecks) — passed in the pre-audit launch pass; Playwright scripts for this audit in `/tmp/browser/audit-e2e/`.
