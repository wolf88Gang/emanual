# Roadmap

## Launch close-out (2026-10-14)
- [ ] Verify and refine hero presentation only in ES/EN/DE at 390/768/1024/1440; run existing suite and record comprehension criteria.
- [ ] Read-only map all eight product actors against live roles, policies, grants, RPCs and UI; document confirmed gaps and unverified exploits without changing permissions.
- [ ] Update launch audit with current visual evidence, actor matrix and prioritized follow-ups; no publishing, deployment or production data writes.

## Phase 2 public entry, access and payment copy
- [x] Verify hosted signup availability and inventory the real acquisition/payment routes without sending emails, creating users or payments. Hosted GET /auth/v1/settings: disable_signup=false, email=true; direct signup CTA retained.
- [x] Rewrite RequestAccess, Auth, Checkout, CheckoutSuccess, ResetPassword and NotFound in ES/EN/DE; preserve all business logic.
- [x] Verify 41 existing tests and desktop 1440/mobile 390 screens in ES/EN/DE; no horizontal overflow or runtime exceptions. Checkout tested with existing session; checking/pending/failed messages tested with intercepted responses, no payments.
- [x] Confirmed-payment remount loop fixed: CheckoutSuccess no longer calls refreshUserData (it set AuthContext.loading, AppRoutes swapped in PageLoader and remounted the page). Verified with simulated paid/pending/failed; no real payment.
- [x] Phase 3: /jobs, /worker/:id, /c/:token, /cliente/:token copy aligned ES/EN/DE; demo jobs labelled fictitious and excluded from JobPosting data; token pages noindex (audit section P)
- [ ] P2 follow-ups: demo job schedule/DE text, worker canonical id, client portal raw status/action labels
- [ ] Valid recovery form, request submission and new-account creation E2E: intentionally untested because this scope prohibits password changes, actual submissions, new users and email sends.

## Public copy repositioning
- [x] Broaden landing ES/EN/DE around the property, people and shared information: new hero/problem, four universal steps, three audience doors, property-first relationship and shared-information differentiator. Only landing copy and minor heading/list presentation changed. Verified 390/1440 in all languages, signup → /auth?mode=signup and how-it-works anchor; no overflow/runtime errors; 41/41 tests and automatic build OK. No publishing or product/pricing changes.
- [x] Rewrite ES/EN/DE public story around instructions, recurring visits, photos/notes and property history.
- [x] Simplify relationship visual and clearly label the illustrative service record; align public SEO without changing routes or product behavior.
- [x] Verify languages, public links, pricing and desktop/mobile layout (390/768/1024/1440px; 41 tests passed).

- [x] Preserve the current Home Guide visual identity while restructuring the public landing with OriginKit-inspired organization and motion.
- [x] Add interactive pricing using the existing checkout pricing rules.
- [x] Verify the refreshed landing on desktop and mobile, then run type, test, and build checks.
- [x] Build the modular Home Guide Public Website V2 narrative and landing-scoped motion system.
- [x] Preserve canonical pricing, SEO, public routing, and complete EN/ES/DE copy.
- [x] Validate motion, reduced motion, sticky behavior, interactions, and visual quality at 390/768/1024/1440px.
- [x] Reposition the public site around place-connected operations, with plants and rentals as optional configurations.
- [x] Update broad-category EN/ES/DE SEO while preserving canonical, routes, pricing, checkout, and private product behavior.
- [x] Re-run functional, accessibility, reduced-motion, responsive, and visual QA at 390/768/1024/1440px.
- [x] Apply and visually validate the selected Midnight Forest treatment across the public landing.
- [x] Separate functional modules from specialized operating configurations in public pricing.
- [x] Restore generous spacing and clear selected states using the adapted Pricing 02 structure.
- [x] Lighten the top navigation while structurally preventing text from showing behind it.
- [x] Validate pricing logic, desktop/mobile layout, scrolling, and reduced motion.

- [x] Replace the four public add-ons with nine canonical add-ons, remove plantops from public pricing, sync server table and tests
- [x] Correct selected add-on contrast in public pricing.
- [x] Add a cleaning-service template to labor rates with daily, weekly, and biweekly frequency options.
- [x] Redesign the 404 page to match the public website in English, Spanish, and German.
- [x] Validate the 404 page on desktop and mobile, including navigation and overflow.

## Visual Service Brief (Before / Target / After)
- [x] Migración: tablas, RLS heredado de tasks, RPCs con matriz de estados, auditoría append-only, storage congelado
- [x] Pruebas negativas de seguridad + camino feliz con datos AUDIT_TEST_VSB
- [x] Capa de servicio + pipeline de imagen (EXIF, 1600px, reintentos) + firmas por lote
- [x] UI: brief del cliente, evaluación, acuerdo, cierre con foto existente, comparación, revisión, historial de planta
- [ ] Validación visual en 390px con una cuenta de organización (bloqueado: la cuenta del preview no tiene organización)
- [ ] Siguiente fase: biblioteca de referencias con clasificación de privacidad (pospuesta)
