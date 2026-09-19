/**
 * Creates an ONVO checkout session for a Home Guide subscription and returns
 * the hosted checkout URL the browser should be redirected to.
 *
 * The ONVO secret key lives ONLY in the ONVO_SECRET_KEY project secret.
 * The price is computed here from the server price table, never taken from
 * the request body.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serverQuote, type BillingInterval, type Currency } from "../_shared/pricing.ts";
import { createOneTimeCheckout } from "../_shared/onvo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const payload = await req.json().catch(() => ({}));
    const interval: BillingInterval = payload?.interval === "annual" ? "annual" : "monthly";
    const currency: Currency = payload?.currency === "CRC" ? "CRC" : "USD";
    const propertyCount = Number(payload?.property_count ?? 1);
    const addonIds: string[] = Array.isArray(payload?.addons)
      ? payload.addons.filter((a: unknown) => typeof a === "string")
      : [];
    const origin = typeof payload?.origin === "string" && payload.origin.startsWith("http")
      ? payload.origin
      : "https://homeguide.casa";

    if (!Number.isFinite(propertyCount) || propertyCount < 1 || propertyCount > 500) {
      return json({ error: "property_count must be between 1 and 500" }, 400);
    }

    const q = serverQuote(interval, propertyCount, addonIds, currency);

    // Organization the payment belongs to (may still be null before onboarding).
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id, email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const description = interval === "annual"
      ? `Home Guide - ${q.propertyCount} ${q.propertyCount === 1 ? "propiedad" : "propiedades"} - plan anual`
      : `Home Guide - ${q.propertyCount} ${q.propertyCount === 1 ? "propiedad" : "propiedades"} - plan mensual`;

    const session = await createOneTimeCheckout({
      amountMinor: q.amountMinor,
      currency: q.currency,
      description,
      customerEmail: profile?.email ?? user.email ?? undefined,
      redirectUrl: `${origin}/checkout/success`,
      cancelUrl: `${origin}/checkout?canceled=1`,
      metadata: {
        userId: user.id,
        orgId: profile?.org_id ?? "",
        interval: q.interval,
        propertyCount: String(q.propertyCount),
        addons: q.addonIds.join(","),
      },
    });

    if (!session?.id || !session?.url) {
      return json({ error: "ONVO did not return a checkout URL" }, 502);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: insertError } = await admin.from("checkout_sessions").insert({
      user_id: user.id,
      org_id: profile?.org_id ?? null,
      onvo_session_id: session.id,
      checkout_url: session.url,
      billing_interval: q.interval,
      property_count: q.propertyCount,
      addons: q.addonIds,
      currency: q.currency,
      amount_minor: q.amountMinor,
    });
    if (insertError) {
      console.error("Failed to record checkout session:", insertError.message);
      return json({ error: "Could not record the checkout attempt" }, 500);
    }

    return json({
      checkoutUrl: session.url,
      sessionId: session.id,
      amountMinor: q.amountMinor,
      currency: q.currency,
      monthlyUsd: q.monthlyUsd,
      totalUsd: q.totalUsd,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("onvo-create-checkout error:", message);
    return json({ error: message }, 500);
  }
});
