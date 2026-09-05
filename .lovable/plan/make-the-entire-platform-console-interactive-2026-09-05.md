# Make the entire platform console interactive

## Confirmed problems

- `/platform/subscriptions`, `/platform/metrics`, `/platform/system`, and `/platform/payments` are registered, but they all render the same general console page. Navigation therefore changes the URL without opening a distinct destination.
- The four “Quick Actions” on Client Management are plain display boxes with no click handlers.
- Client organization rows have no organization-detail action. Only email and edit-plan are currently available.
- Dashboard cards and shortcuts point at the placeholder destinations above, so many clicks appear to do nothing.
- Data-loading failures on the console and client list are only written to the browser console. The visible page can remain empty or misleading when a request fails.
- Requests supports status changes, but lacks a visible query-error state and per-action success feedback.
- Console subscription and revenue totals count raw legacy subscription rows, while Client Management already chooses one canonical plan per organization. The two screens can therefore disagree.
- The displayed system-health rows are hardcoded as operational and are not real diagnostics.

## Implementation

### 1. Give every platform destination a real screen

Create focused platform views for:

- **Subscriptions and plans:** searchable organization-level plan list, status/type/amount/currency, edit action, and clear empty/error/loading states.
- **Metrics:** real totals and breakdowns derived from organizations, users, sites, subscriptions, tasks, and assets, with clickable drill-downs where a matching destination exists.
- **System:** honest data/service diagnostics based on actual query results instead of permanently hardcoded “Operational” labels.
- **Payments:** payment/subscription transaction history using the available subscription payment fields, without inventing payment records.

Wire each route to its own page and keep the active top navigation state correct for nested/detail URLs.

### 2. Make client organizations openable and manageable

- Make each organization row expose a clear **Open organization** action.
- Add an organization detail view showing members, sites, subscription, contact information, and dates from existing records.
- Keep email as an external mail action and make its icon accessible.
- Move plan editing into a shared organization-level plan editor so the client detail page and subscription page behave consistently.
- Support the plan’s stored currency instead of forcing every save to USD.
- Validate amount/status/type before saving and show success or failure visibly.

### 3. Replace every inert or misleading control

- Convert Client Management quick-action boxes into actual buttons/links with meaningful destinations or filters.
- Audit all controls under `/platform`, including the top navigation, dashboard rail, statistic tiles, recent subscriptions, quick actions, client rows, plan dialog, request statuses, language/theme controls, and sign-out.
- Remove controls that cannot perform a real action rather than leaving decorative elements that look clickable.
- Remove the unreachable duplicate platform navigation from the tenant sidebar so the live platform header remains the single route source.
- Use the shared button/link components and keyboard-accessible labels throughout.

### 4. Harden data and feedback states

- Check every platform query and surface a visible retryable error instead of silently logging failures.
- Use one organization-level subscription aggregation everywhere so active-plan and revenue totals do not double-count legacy member-level rows.
- Treat partial failures independently so one unavailable metric does not blank the whole console.
- Add consistent loading, empty, saving, success, and failure states.
- Refresh affected lists and totals after plan or request-status changes.
- Preserve platform-admin guards and tenant isolation.

### 5. Verify the complete admin journey

Run an authenticated browser audit that clicks, rather than directly loads, every platform navigation item and action:

```text
Console
  → Clients
    → Open organization
    → Edit and save plan
  → Subscriptions
    → Search/filter
    → Edit and save plan
  → Requests
    → Change request status
  → Metrics
    → Open available drill-downs
  → Payments
  → System
  → Theme / language / sign out
```

Verify desktop and narrow-screen layouts, final URLs, visible state changes, persisted updates, console errors, and failed network requests. Add focused regression tests for route-to-page mapping and shared plan-update behavior.

## Technical notes

- Reuse the existing platform shell, localization pattern, semantic design tokens, and current database tables.
- Do not add invented analytics or fake health statuses.
- Keep billing organization-based and preserve existing accounts and subscriptions.
- No new public access or role changes are included.
