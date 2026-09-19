/**
 * Minimal ONVO Pay client.
 *
 * ── How to switch between TEST and LIVE (no code changes) ───────────────────
 * Everything is driven by project secrets / environment variables:
 *
 *   ONVO_ENV = "test"  -> fake payments, ONVO test cards
 *   ONVO_ENV = "live"  -> real money (default when ONVO_ENV is not set)
 *
 * Keys per environment (set them as project secrets, never in code):
 *
 *   TEST:  ONVO_SECRET_KEY_TEST   (onvo_test_secret_key_...)
 *          ONVO_WEBHOOK_SECRET_TEST
 *   LIVE:  ONVO_SECRET_KEY_LIVE   (onvo_live_secret_key_...)
 *          ONVO_WEBHOOK_SECRET_LIVE
 *
 * Backwards compatibility: if the per-environment secret is missing, the
 * legacy single secrets ONVO_SECRET_KEY / ONVO_WEBHOOK_SECRET are used.
 * ONVO uses the SAME API host for both environments; the key itself decides
 * whether a charge is a test charge, so no endpoint switch is needed.
 *
 * NEVER hardcode or log any of these values.
 */
import { periodEnd, type BillingInterval } from "./pricing.ts";

const ONVO_API_BASE = "https://api.onvopay.com/v1";

export type OnvoMode = "test" | "live";

/** Active ONVO environment. Defaults to "live" when ONVO_ENV is not set. */
export function onvoMode(): OnvoMode {
  return (Deno.env.get("ONVO_ENV") ?? "").trim().toLowerCase() === "test" ? "test" : "live";
}

function env(name: string): string | undefined {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : undefined;
}

function secretKey(): string {
  const mode = onvoMode();
  const key = mode === "test"
    ? env("ONVO_SECRET_KEY_TEST") ?? env("ONVO_SECRET_KEY")
    : env("ONVO_SECRET_KEY_LIVE") ?? env("ONVO_SECRET_KEY");
  if (!key) {
    throw new Error(
      `ONVO secret key for mode "${mode}" is not configured ` +
        `(expected ONVO_SECRET_KEY_${mode.toUpperCase()} or ONVO_SECRET_KEY)`,
    );
  }
  return key;
}

/**
 * Webhook secret(s) accepted for the active environment. Returns the
 * environment-specific secret plus the legacy one, so a webhook registered
 * before this change keeps working. Values are never logged.
 */
export function acceptedWebhookSecrets(): string[] {
  const mode = onvoMode();
  const specific = mode === "test" ? env("ONVO_WEBHOOK_SECRET_TEST") : env("ONVO_WEBHOOK_SECRET_LIVE");
  return [specific, env("ONVO_WEBHOOK_SECRET")].filter((s): s is string => !!s);
}

/** True when the active environment is the ONVO test environment. */
export function isTestMode(): boolean {
  return onvoMode() === "test" || (() => {
    try {
      return secretKey().includes("_test_");
    } catch {
      return false;
    }
  })();
}

async function onvoFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${ONVO_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    // Log status and ONVO's message only — never the key or full headers.
    console.error("ONVO request failed", path, response.status, JSON.stringify(body).slice(0, 500));
    throw new Error(`ONVO ${path} failed with status ${response.status}`);
  }

  return body as Record<string, unknown>;
}

export interface OnvoSession {
  id: string;
  url: string;
  status?: string;
  paymentStatus?: string;
  amountTotal?: number;
  currency?: string;
  paymentIntentId?: string;
  metadata?: Record<string, string>;
}

/** Creates a one-time checkout link for a fixed amount. */
export async function createOneTimeCheckout(params: {
  amountMinor: number;
  currency: "USD" | "CRC";
  description: string;
  customerEmail?: string;
  redirectUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<OnvoSession> {
  const body = await onvoFetch("/checkout/sessions/one-time-link", {
    method: "POST",
    body: JSON.stringify({
      lineItems: [
        {
          quantity: 1,
          unitAmount: params.amountMinor,
          currency: params.currency,
          description: params.description,
        },
      ],
      ...(params.customerEmail ? { customerEmail: params.customerEmail } : {}),
      redirectUrl: params.redirectUrl,
      cancelUrl: params.cancelUrl,
      ...(params.metadata ? { metadata: params.metadata } : {}),
    }),
  });

  return body as unknown as OnvoSession;
}

/** Reads a checkout session back from ONVO to confirm the real payment state. */
export async function getCheckoutSession(sessionId: string): Promise<OnvoSession> {
  const body = await onvoFetch(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
  return body as unknown as OnvoSession;
}

export function isPaid(session: OnvoSession): boolean {
  return session.paymentStatus === "paid" || session.status === "complete";
}

/**
 * Turns a confirmed ONVO payment into an active subscription for the
 * organization. Idempotent: calling it twice for the same session does not
 * create a second subscription row.
 */
export async function activateSubscription(
  admin: {
    from: (table: string) => any;
  },
  row: {
    id: string;
    user_id: string;
    org_id: string | null;
    onvo_session_id: string;
    billing_interval: BillingInterval;
    property_count: number;
    addons: unknown;
    currency: string;
    amount_minor: number;
  },
  session: OnvoSession,
) {
  const now = new Date();
  const end = periodEnd(row.billing_interval, now);
  const amount = row.amount_minor / 100;

  const subscription = {
    user_id: row.user_id,
    org_id: row.org_id,
    plan_type: row.billing_interval,
    billing_interval: row.billing_interval,
    property_count: row.property_count,
    addons: row.addons ?? [],
    status: "active",
    amount,
    currency: row.currency,
    onvo_session_id: row.onvo_session_id,
    onvo_payment_intent_id: session.paymentIntentId ?? null,
    current_period_start: now.toISOString(),
    current_period_end: end.toISOString(),
    trial_started_at: null,
    trial_ends_at: null,
  };

  const existingQuery = admin.from("subscriptions").select("id").limit(1);
  const { data: existing } = row.org_id
    ? await existingQuery.eq("org_id", row.org_id).maybeSingle()
    : await existingQuery.eq("user_id", row.user_id).maybeSingle();

  if (existing?.id) {
    await admin.from("subscriptions").update(subscription).eq("id", existing.id);
  } else {
    await admin.from("subscriptions").insert(subscription);
  }

  await admin
    .from("checkout_sessions")
    .update({
      status: "paid",
      paid_at: now.toISOString(),
      onvo_payment_intent_id: session.paymentIntentId ?? null,
      updated_at: now.toISOString(),
    })
    .eq("id", row.id);
}
