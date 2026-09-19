#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# ONVO checkout smoke test (manual, safe to run in test mode).
#
# It only exercises OUR functions; the ONVO secret key never leaves the server
# and is never printed here. Requires a signed-in user's access token.
#
# 1) Get an access token for a test user (browser console of the running app):
#      (await supabase.auth.getSession()).data.session.access_token
# 2) Export it and run this script:
#      export SUPABASE_URL="https://<project-ref>.supabase.co"
#      export ACCESS_TOKEN="eyJ..."
#      bash scripts/onvo-smoke-test.sh
#
# Expected: a checkoutUrl such as https://checkout.onvopay.com/pay/test_...
# Open it, pay with the ONVO test card, and the webhook activates the account.
# ---------------------------------------------------------------------------
set -euo pipefail

: "${SUPABASE_URL:?set SUPABASE_URL}"
: "${ACCESS_TOKEN:?set ACCESS_TOKEN}"

echo "== 1. Create a checkout session (2 properties + labor add-on, USD) =="
curl -sS -X POST "$SUPABASE_URL/functions/v1/onvo-create-checkout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"interval":"monthly","currency":"USD","property_count":2,"addons":["labor"],"origin":"https://homeguide.casa"}'
echo

echo "== 2. Subscription status before paying (expect pending) =="
curl -sS -X POST "$SUPABASE_URL/functions/v1/onvo-subscription-status" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" -d '{}'
echo

echo "== 3. After paying with the ONVO test card, verify + status (expect paid/active) =="
curl -sS -X POST "$SUPABASE_URL/functions/v1/onvo-verify-checkout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" -d '{}'
echo
curl -sS -X POST "$SUPABASE_URL/functions/v1/onvo-subscription-status" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" -d '{}'
echo

echo "== 4. Webhook must reject a wrong secret (expect 401) =="
curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$SUPABASE_URL/functions/v1/onvo-webhook" \
  -H "Content-Type: application/json" -H "X-Webhook-Secret: wrong" \
  -d '{"type":"checkout-session.succeeded","data":{"id":"cs_fake"}}'
