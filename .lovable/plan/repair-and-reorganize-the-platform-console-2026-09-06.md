# Repair and reorganize the platform console

## Confirmed problems

- **Subscriptions, Metrics, System, and Payments are not real destinations.** Their URLs are registered, but all four render the same general Platform Administration page. Clicking them can change the URL while leaving the visible screen effectively unchanged.
- **The platform sidebar disappeared.** Platform accounts now use a separate compact top strip even though a complete platform navigation set still exists in the application sidebar code.
- **The two rows of navigation duplicate each other.** The top strip and the dashboard shortcut pills lead to many of the same places without establishing a clear hierarchy.
- **Client Management contains four boxes that look interactive but are plain display elements.** “Client Organizations,” “Manage Plans,” “View Metrics,” and “New this month” have no actions.
- **Client organization records cannot be opened.** The list only exposes email and edit-plan icons, so there is no organization overview.
- **Errors are often invisible.** Console and client queries log failures to the browser instead of showing a useful error and retry action.
- **Console billing totals can disagree with Client Management.** The console totals raw active subscription rows, while the client list selects one canonical subscription per organization.
- **System health is hardcoded as operational.** It does not report verified service state.

## Implementation

### 1. Restore a clear platform sidebar

- Replace the platform-only top navigation strip with the existing collapsible Home Guide sidebar pattern.
- Give platform administrators one persistent navigation hierarchy: **Console, Clients, Subscriptions, Requests, Payments, Metrics, System**.
- Keep the sidebar visible on desktop and available through the standard menu control on narrow screens.
- Add the currently missing **Requests** entry and preserve theme, language, sign-out, active-page highlighting, and safe-area behavior.
- Remove duplicate navigation that competes with the sidebar. Dashboard shortcuts remain only when they perform a useful contextual action.

### 2. Give every destination its own organized screen

- **Console:** concise overview and a small set of useful shortcuts.
- **Clients:** searchable organization list and organization access.
- **Subscriptions:** searchable organization-level plans with status, billing cycle, amount, currency, and edit action.
- **Requests:** review queue with reliable status changes and visible feedback.
- **Payments:** payment/subscription history using only fields that actually exist.
- **Metrics:** real totals and breakdowns for organizations, users, sites, subscriptions, tasks, and assets.
- **System:** honest query/service diagnostics instead of permanently hardcoded green statuses.

Each URL will render distinct page content with a matching title, active sidebar item, loading state, empty state, error state, and retry action.

### 3. Make client organizations and plans fully usable

- Add a clear **Open organization** action to every client row.
- Add an organization detail screen using existing records for members, sites, subscription, contact information, and dates.
- Reuse one plan editor from the client detail and subscription screens.
- Preserve the plan's selected USD or CRC currency instead of forcing USD.
- Validate plan amount, status, billing cycle, and currency; show visible success/failure feedback and refresh all affected totals after saving.
- Keep email as an accessible external email action.

### 4. Repair or remove every inert control

Audit the full platform area, including:

- Sidebar destinations and mobile menu behavior
- Console shortcuts, statistic tiles, recent subscriptions, and action buttons
- Client summary boxes, search, organization rows, email, open, and plan editing
- Subscription filters and plan actions
- Request email/phone links and status controls
- Metrics drill-downs
- Payment rows
- System retry/diagnostic actions
- Theme, language, and sign-out

Any control without a meaningful action will either be connected to a real result or restyled as non-interactive information so it no longer looks clickable.

### 5. Organize information and harden data states

- Use one organization-level subscription calculation across Console, Clients, Subscriptions, Metrics, and Revenue so legacy duplicate rows do not inflate totals.
- Allow independent sections to succeed or fail without blanking the entire page.
- Add consistent loading, empty, saving, success, failure, and retry states.
- Keep the existing platform-admin access guard and tenant isolation unchanged.
- Use the existing Home Guide design tokens, Montserrat typography, trilingual labels, and compact professional visual language.

### 6. Verify the complete click journey

Run an authenticated browser audit by clicking every destination and action rather than loading URLs directly:

```text
Sidebar
  → Console
  → Clients
      → Open organization
      → Edit and save plan
      → Email contact
  → Subscriptions
      → Search/filter
      → Edit and save plan
  → Requests
      → Change request status
  → Payments
  → Metrics
      → Open valid drill-downs
  → System
      → Retry diagnostics
  → Theme / language / sign out
```

Verify desktop and narrow-screen layouts, final URLs, distinct page titles/content, persisted updates, visible errors, browser console errors, and failed network requests. Add focused route and interaction regression tests for the platform pages.

## Scope boundaries

- No invented analytics, payment records, or health results.
- No new public access or role changes.
- No redesign of tenant workspaces outside the shared sidebar behavior required for platform navigation.
- Existing organizations, users, subscriptions, and access requests remain intact.
