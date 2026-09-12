# HomeGuide Launch Readiness Audit

Goal: decide, with evidence, whether a paying plant-maintenance company can run their real clients, properties, plants and maintenance work tomorrow without data loss, data leaks, fake functionality or workflow blockers.

No redesign, no new features, no refactors. Only fixes for confirmed critical risks (see "Immediate fixes" below).

## Deliverable

A living document at the project root: `HOMEGUIDE_LAUNCH_READINESS_AUDIT.md`, containing readiness decision, score, P0/P1/P2/P3 findings, feature inventory (WORKING / PARTIAL / BROKEN / MISSING / UNVERIFIED), database and access-rule findings, the three end-to-end test results step by step, dead or placeholder functionality, launch checklist, and the exact Day 1 scope we can honestly promise.

Every finding records: location, exact issue, reproduction steps, customer impact, severity, recommended fix, evidence.

Anything I cannot prove is marked UNVERIFIED. Nothing is called ready without evidence.

## Immediate fixes during the audit

I stop and fix on the spot only these classes of confirmed problem: cross-customer data visibility, broken or missing access rules, private files reachable by others, exposed secrets, risk of losing or corrupting maintenance history, and total sign-in failure.

Each such fix is logged in the report as: original finding, severity, evidence, change made, files and database objects touched, re-test performed, result.

Everything else is reported only, and waits for your go-ahead.

## Test data

Created in the live database with clearly identifiable names so nothing is confused with real customers, and left in place for your review:
`AUDIT_TEST_ORG_A`, `AUDIT_TEST_ORG_B`, `AUDIT_TEST_CLIENT`, `AUDIT_TEST_PROPERTY`, `AUDIT_TEST_MONSTERA_01`.

## Phases

1. **System map.** Routes and their guards, sections, roles, data-fetching approach; database tables, functions, triggers, server functions, storage, scheduled jobs, email sending. Written as a single flow: user, sign-in, profile, organization, client, site, plant, care plan, scheduled work, technician action, evidence, history, dashboard. Then state which links in that chain really exist.

2. **Data separation between customers.** Verify every table's access rules and grants against real queries, plus stored procedures, server functions, storage paths, dashboards, counts, search and exports. Any path where one customer can reach another's data is a blocker.

3. **Database health.** Table by table: ownership column, keys, timestamps, status values, delete/archive behaviour, missing links, records with no parent, duplicates, inconsistent naming, missing indexes on the columns actually filtered, tables the app still reads that shouldn't exist.

4. **Sign-in lifecycle.** Invitation, sign-in, sign-out, password reset (valid, invalid, expired), refresh while signed in, opening a protected page while signed out, redirect behaviour, several tabs, mobile. Watch for redirect loops and protected content flashing before access is resolved.

5. **Roles and permissions matrix.** Which roles exist in reality, and for each: view, create, edit, delete, assign, export, admin. Test enforcement in the database, not just hidden buttons.

6. **First-customer path.** New organization through to first completed visit, recording every point of friction: empty screens, guidance, required fields, validation, duplicate prevention, confirmations, where you land after saving, ability to correct mistakes.

7. **Core records.** Clients, properties and areas, plants: create, edit, search, filter, archive, many records, precise enough location for a technician to find the plant, and whether history survives edits and archiving.

8. **Care information and plans.** Whether species care values are real records, generated, or placeholder, flagging any misleading care instruction; how frequency, next service date and overdue state are produced, including date and timezone correctness across daily, weekly, biweekly and monthly rhythms.

9. **Work lifecycle.** Which single concept represents work, and whether create, schedule, assign, reassign, start, complete, cancel, reschedule and overdue form a coherent sequence with no impossible states.

10. **Technician experience on a phone.** 360, 390 and 430 px plus tablet: today's work, where to go, which plants, what to do, what happened last time, photos, notes, completion. Tap targets, camera upload, large phone photos, double submits, form data loss, slow network, back navigation.

11. **Completion writes.** After a completed visit, confirm every dependent record updates together: history, next service, overdue counts, plant condition, technician activity, customer-visible history. Look for partial writes.

12. **Replacement.** Dead or damaged plant replaced: reason and removal date kept, old history intact and still readable, replacement linked, old record inactive, future work following the new plant.

13. **Photos and files.** Formats, size limits, naming, who can read what, signed versus public links, orphan files after deletions, broken images, phone camera photos.

14. **Dashboard numbers.** Every figure traced to its query, filters, customer scope and date scope. Any invented, demo or hardcoded figure is reported immediately.

15. **Notifications and email.** What exists, whether it actually sends, sender and branding, links pointing at the live site, broken templates, and any feature that looks active but has no delivery behind it.

16. **Billing.** Report the real state, including whether first customers can be set up by hand. Nothing built during the audit.

17. **Production configuration.** Live domain, environment values, redirect addresses, leftover local or staging references, debug output, test credentials, any secret reachable from the browser.

18. **Failure handling, loading and empty states.** Force failures: offline, database error, expired session, upload failure, oversized file, duplicate, invalid data. Check swallowed errors, silent failures, vague messages, lost input, pages that look empty while loading.

19. **Performance.** Oversized queries, missing pagination, repeated queries, unindexed filters, huge images, heavy lists, slow dashboard aggregation.

20. **Data integrity.** Invalid sequences: plant with no property, property with no client, work with no plant, work assigned to a removed technician, deleting a property with active plants, deleting a client with history, replacing an already replaced plant, completing the same job twice.

21. **Audit trail, privacy, accessibility.** Who created or changed what and when; personal data stored and whether access, export and deletion are possible; labels, keyboard use, contrast, icon-only actions, focus and modal traps.

22. **Repository forensics.** Search for leftovers and shortcuts: TODO, FIXME, HACK, temporary, mock, demo, fake, placeholder, hardcoded, localhost, example.com, console output, "coming soon", "not implemented", bypasses and admin overrides; plus unused routes, abandoned or duplicated pages, dead data hooks, references to tables that no longer matter.

23. **Three end-to-end runs.** (a) Full journey: organization, admin, client, property, area, plant with photo, species, location, condition and instructions, recurring care, technician assigned, sign out, technician signs in, finds and completes the work with photo and note, admin confirms history, photo, next service and dashboard counts. (b) Replacement as above. (c) Two organizations, then attempt to reach organization B's records while signed in as A, through direct addresses, queries, search, dashboard, photo links and exports. Each step recorded PASS or FAIL.

24. **Also noted, not changed:** places where the product is unnecessarily locked to plants specifically, listed for later, with no scope expansion now.

## Production-safety guardrails

Because this audit writes test records into the live environment:

1. Never modify, delete, archive, reassign, or otherwise mutate an existing non-audit customer, user, property, plant, task, file, subscription, invoice, or historical record.
2. Every test object must be unmistakably audit-owned: names prefixed with `AUDIT_TEST_`, metadata/tag `audit_test = true` where supported, and a complete inventory of every test record ID created so cleanup can be performed safely later.
3. Test activity must NOT contact real people. Do not send email/SMS/push notifications to existing customers or technicians. Any test user/invitation must use controlled audit addresses. If notification delivery cannot be safely isolated, test generation/queueing only and mark external delivery UNVERIFIED.
4. Test records must NOT trigger real commercial or operational side effects: no real billing, no payment capture, no subscription activation with an external provider, no real customer invoices, no third-party service orders, no irreversible external webhook actions, no messages to production customers.
5. Before any immediate P0 fix: capture the original state/evidence first, use the smallest reversible change possible, do not perform destructive migrations or broad schema rewrites, do not drop tables/columns/policies, do not bulk-update production records. If a P0 requires a destructive or difficult-to-reverse change, STOP, document it and request approval instead.
6. After every immediate P0 fix: reproduce the original exploit/failure, verify it now fails safely, verify the legitimate workflow still works, verify Organization A and Organization B remain isolated, and record exact SQL/code/policy changes in HOMEGUIDE_LAUNCH_READINESS_AUDIT.md.
7. Before beginning E2E writes, record the current production baseline: existing organization count, client count, property count, plant/asset count, active task/work-order count, and relevant storage object count if practical. This is only a sanity baseline, not a request to export customer data.
8. At the end, include an AUDIT TEST DATA INVENTORY containing every organization, user, client, property, area, plant, task, visit and file created during testing, with IDs, so all audit data can later be removed without touching legitimate records.

## Technical notes

- Verification uses direct database queries, the access-rule linter, the security scanner, server-function logs, typecheck, tests, build, and an authenticated browser run of the real screens at the listed widths.
- Cross-customer checks are executed as two real signed-in sessions, not inferred from policy text.
- Browser coverage: Chrome desktop and Chrome Android emulation are testable here; Safari on iPhone, Safari desktop and Edge will be marked UNTESTED with a manual checklist.
- Any finding I cannot reproduce is recorded as UNVERIFIED with the reason, rather than assumed working or broken.

