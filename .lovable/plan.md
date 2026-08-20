# Coherence fix: onboarding P0, care science, roles, module persistence

Note: this is a large correctness pass, so it goes through plan approval once — then it is implemented in one go, no further approvals.

## 1. Business onboarding (P0)

Confirmed: `organizations` has columns `id, name, org_type, business_archetype, account_scope, modules_json, plantops_care_settings_json, created_at, updated_at` — no `country`, and `profiles` has no `country` either. That is why `complete_business_onboarding` fails.

- Additive migration: `ALTER TABLE public.organizations ADD COLUMN country text`.
- Rewrite `complete_business_onboarding` to write org name, archetype, scope, modules_json, country on the organization, the owner role, and the profile org link only. No estate created.
- Onboarding UI: destructive toast on any RPC error, keep all entered values, stay on the modules step, allow retry, never navigate on failure.
- Re-test signup + finish end-to-end before continuing.

## 2. Remove organization-wide agronomic day offsets

- Delete the pot material / ventilation / actual light / month "+days" factor sections and the "positive values stretch the interval" helper text from `/plantops/settings`.
- Stop exposing `plantops_care_settings_json` as an owner-facing coefficient editor (column stays in the DB, unused by the engine).

## 3-5. Canonical care model

Rewrite `plantops_effective_care()` (and the care queue) to resolve, in this precedence:

1. documented manual override (value + reason + actor + timestamp)
2. explicit placement baseline, only when deliberately set
3. structured species baseline from `plant_profiles.care_template_json`
4. otherwise `REVISAR`

- Remove all org-level factor arithmetic; add no replacement constants.
- Species baseline is used automatically — no "Use as base" copy step, no duplication into the placement. Source is reported as `species_profile` / `placement` / `override`.
- No free-text parsing into numeric days.
- Environmental data becomes review signals, not day math: e.g. species requires indirect light while actual light is artificial/insufficient → light-mismatch flag / review, never `+2 days`.

## 6. Data stays where it belongs

Pot (material, diameter, height, volume, drainage, holes, saucer, reservoir) and placement (actual light, ventilation, textual location, observations) fields remain editable on the plant/pot/placement forms. Species requirements stay on the plant profile.

## 7. Care editor becomes a review/exception screen

Four intentional sections, structured rendering only (no raw JSON, no "configured factors: +X"): Species requirements · Actual conditions · Operational result (effective baseline + source, last watered, next due, responsibility) · Exceptions (override with mandatory reason, actor, date).

## 8. Settings by role

- Owner/manager: business profile, archetype, modules, team, communication defaults, language/timezone, reminder defaults, portal defaults, billing (only when the billing module is on).
- Crew: no organization settings; work/visits/care/tools only.
- Client: portal only, no internal settings.
- Platform admin: platform configuration only, no tenant care configuration.

## 9-10. Module save must change the app immediately

- Save persists exact explicit booleans to `modules_json`; archetype suggestions apply only when `modules_json` has never been set (no silent restore after an explicit save).
- Invalidate module state so sidebar, dashboard and route guards update with no reload; disabled routes become blocked immediately.
- Post-save confirmation summarizing enabled module count and names.
- Verified by reading `organizations.modules_json` before and after save and asserting the exact Natalia set (on: clients, projects, plants_pots, care, reminders, client_portal; everything else off), then checking navigation shows only Home, Clients, Sites, Plants, Care, Reminders, Settings.

## 11. Clients vs Sites navigation

Today the `projects` module points at `/plantops/clientes`, the same screen as `clients` — that is the duplication the pilot found.

- `/clients` → client list; client detail → that client's sites.
- `/sites` → new organization-wide site list (all clients), owned by the `projects` module.

## 12. Portal discoverability

Portal tab/action visible in client detail and a share action in the site view whenever `client_portal` is on. No hidden URLs.

## 13. Public portal i18n

`/cliente/:token` in EN/ES/DE, resolved from contact `preferred_language` → organization default → browser → EN. Invalid/expired token messages localized too.

## 14. Email confirmation

Verify signup confirmation against the live configured sender/domain and report the exact infrastructure state. Production auth is not weakened; only an already-supported QA path is used if verification is still propagating.

## 15-16. Pilot re-run and tests

Fresh Natalia flow end-to-end (business → plant care archetype → minimal modules → finish → business home → client → site → plant with linked species profile → species baseline used automatically → environment → reminder → portal → record care → next due), asserting no coefficient UI, no duplicate baseline entry, no arbitrary +days, modules respected instantly.

Tests added for: onboarding no longer touching `profiles.country`; species baseline used when placement baseline is absent; placement baseline superseding species; documented override superseding both; no org factor affecting effective days; light mismatch raising review without day changes; pot data stored without changing intervals; module save persisting exact booleans; disabled module disappearing; disabled route blocked; `/clients` vs `/sites` distinct; portal EN/ES/DE. Then typecheck, lint, tests and build.

## Technical notes

- Migrations: `organizations.country` (additive), rewritten `complete_business_onboarding`, rewritten `plantops_effective_care` and care-queue baseline resolution, override columns (value/reason/actor/timestamp) on placements if not already present.
- Frontend: `Onboarding.tsx`, `PlantOpsSettings.tsx`, `PlantOpsCareEditor.tsx`, `plantopsCare.ts`, `useModules.ts`, `homeGuideModules.ts` (projects navRoute → `/sites`), new sites list page, client detail portal action, public portal i18n.
- Nova Silva data is not touched; no new product modules.
