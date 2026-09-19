/**
 * Reports whether the authenticated user's subscription is active.
 *
 * Used by the app after returning from ONVO (and on reload) to decide between
 * the dashboard and the checkout screen. Reads only from our own database, so
 * it is cheap and safe to poll.
 *
 * Secrets note: this function needs no ONVO key. ONVO_SECRET_KEY and
 * ONVO_WEBHOOK_SECRET are configured as project secrets only, never in code.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const userId = userData.user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("org_id")
      .eq("id", userId)
      .maybeSingle();

    const base = admin
      .from("subscriptions")
      .select("status, plan_type, billing_interval, property_count, addons, currency, amount, current_period_end")
      .order("created_at", { ascending: false })
      .limit(1);

    const { data: subscription } = profile?.org_id
      ? await base.eq("org_id", profile.org_id).maybeSingle()
      : await base.eq("user_id", userId).maybeSingle();

    // Is there a checkout attempt still waiting for the webhook?
    const { data: attempt } = await admin
      .from("checkout_sessions")
      .select("status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const periodValid = subscription?.current_period_end
      ? new Date(subscription.current_period_end) > new Date()
      : true;
    const active = subscription?.status === "active" &&
      subscription.plan_type !== "trial" &&
      periodValid;

    return json({
      status: active ? "active" : attempt?.status === "pending" ? "pending" : "none",
      active,
      subscription: subscription ?? null,
      lastCheckout: attempt ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("onvo-subscription-status error:", message);
    return json({ error: message }, 500);
  }
});
