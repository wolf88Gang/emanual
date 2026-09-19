/**
 * Confirms a checkout after ONVO redirects the buyer back, by reading the
 * session state from ONVO with the secret key. Never trusts the browser.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { activateSubscription, getCheckoutSession, isPaid } from "../_shared/onvo.ts";

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

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.session_id === "string" ? body.session_id : null;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Either the session the browser reports, or the latest pending attempt
    // for this user (ONVO does not always append an id to the redirect).
    let query = admin
      .from("checkout_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (sessionId) query = query.eq("onvo_session_id", sessionId);

    const { data: row } = await query.maybeSingle();
    if (!row) return json({ status: "not_found" }, 404);
    if (row.status === "paid") return json({ status: "paid" });

    const session = await getCheckoutSession(row.onvo_session_id);

    if (!isPaid(session)) {
      return json({ status: session.paymentStatus ?? session.status ?? "pending" });
    }

    // Amount guard: refuse to activate if what was paid is less than quoted.
    const paidMinor = Number(session.amountTotal ?? 0);
    if (paidMinor < row.amount_minor || session.currency !== row.currency) {
      console.error("ONVO amount mismatch", {
        paidMinor,
        expected: row.amount_minor,
        paidCurrency: session.currency,
        expected_currency: row.currency,
      });
      await admin.from("checkout_sessions").update({ status: "failed" }).eq("id", row.id);
      return json({ status: "amount_mismatch" }, 400);
    }

    await activateSubscription(admin, row, session);
    return json({ status: "paid" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("onvo-verify-checkout error:", message);
    return json({ error: message }, 500);
  }
});
