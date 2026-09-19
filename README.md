# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Payments: ONVO Pay checkout

### Pieces

| Piece | Where |
| --- | --- |
| Create checkout session | `supabase/functions/onvo-create-checkout/index.ts` |
| Webhook receiver (`checkout-session.succeeded`) | `supabase/functions/onvo-webhook/index.ts` |
| Verify a returning payment | `supabase/functions/onvo-verify-checkout/index.ts` |
| Subscription status (active / pending / none) | `supabase/functions/onvo-subscription-status/index.ts` |
| Shared ONVO client and activation | `supabase/functions/_shared/onvo.ts` |
| Server price table (authoritative) | `supabase/functions/_shared/pricing.ts` |
| Checkout screen | `src/pages/Checkout.tsx` |
| Return screen | `src/pages/CheckoutSuccess.tsx` |
| Paywall routing | `src/App.tsx` (`SubscribedRoute`), `src/contexts/SubscriptionContext.tsx` |

Webhook URL to register in the ONVO dashboard for the event
`checkout-session.succeeded`:

```
https://<project-ref>.supabase.co/functions/v1/onvo-webhook
```

### Environment variables

Set these ONLY as project secrets (Lovable secrets / Supabase function secrets),
never in source code, and never log their values:

```
ONVO_SECRET_KEY=        # onvo_test_secret_key_... or onvo_live_secret_key_...
ONVO_WEBHOOK_SECRET=    # shown next to the webhook in the ONVO dashboard
```

Going live is a single change: replace the value of `ONVO_SECRET_KEY` with the
live key.

### Payload sent to ONVO

The browser sends the plan selection; the amount is always recomputed on the
server from `_shared/pricing.ts`, so a tampered request cannot lower the price.

```json
POST https://api.onvopay.com/v1/checkout/sessions/one-time-link
{
  "lineItems": [
    {
      "quantity": 1,
      "unitAmount": 5000,
      "currency": "USD",
      "description": "Home Guide - 2 propiedades - plan mensual"
    }
  ],
  "customerEmail": "owner@example.com",
  "redirectUrl": "https://homeguide.casa/checkout/success",
  "cancelUrl": "https://homeguide.casa/checkout?canceled=1",
  "metadata": {
    "userId": "<auth user id>",
    "orgId": "<organization id>",
    "interval": "monthly",
    "propertyCount": "2",
    "addons": "labor"
  }
}
```

ONVO replies with `{ "id": "...", "url": "https://checkout.onvopay.com/pay/..." }`.
The attempt is recorded in `public.checkout_sessions` with `status = 'pending'`
and the expected `amount_minor` / `currency`.

### How the subscription is activated

`checkout-session.succeeded` arrives at `onvo-webhook`, which:

1. Rejects the request unless `X-Webhook-Secret` matches `ONVO_WEBHOOK_SECRET`.
2. Looks up the attempt by `onvo_session_id`.
3. Claims the row (`pending`/`processing` -> `processing`) so a repeated
   delivery of the same event is a no-op: idempotency.
4. Refuses activation if the paid amount or currency is lower than quoted.
5. Calls `activateSubscription()`, which upserts one row in
   `public.subscriptions` for the organization:

```ts
{
  org_id, user_id,
  plan_type: 'monthly' | 'annual',
  status: 'active',
  property_count, addons, amount, currency,
  onvo_session_id, onvo_payment_intent_id,
  current_period_start: now, current_period_end: now + 1 month | 12 months,
  trial_started_at: null, trial_ends_at: null
}
```

and flips the attempt to `status = 'paid'` with `paid_at`.

`onvo-verify-checkout` performs the same confirmation on demand by reading the
session back from ONVO, for the case where the buyer returns before the webhook
lands.

### Testing the whole flow

1. Create an account at `/auth?mode=signup`. The app lands on `/checkout`.
2. Pick monthly or annual, the number of properties, extras and USD or CRC.
3. Press "Pay with ONVO" and pay on the ONVO page with the ONVO test card.
4. You return to `/checkout/success`, which confirms server-side and then lets
   you into the platform. Reloading any route no longer bounces you back to
   checkout.
5. Optional shortcut: `bash scripts/onvo-smoke-test.sh` (see the comments at the
   top of that file) creates a test session and prints the checkout URL.
