/**
 * ONVO webhook receiver. Activates the subscription as soon as ONVO reports
 * the checkout session succeeded, even if the buyer closes the tab before the
 * redirect lands.
 *
 * Configure the endpoint URL in the ONVO dashboard and store the webhook
 * secret it shows as the ONVO_WEBHOOK_SECRET project secret. ONVO sends it in
 * the X-Webhook-Secret header.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { activateSubscription, type OnvoSession } from "../_shared/onvo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const expectedSecret = Deno.env.get("ONVO_WEBHOOK_SECRET");
  const providedSecret = req.headers.get("X-Webhook-Secret");
  if (!expectedSecret || providedSecret !== expectedSecret) {
    console.error("Rejected ONVO webhook: invalid or missing webhook secret");
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  try {
    const event = await req.json();
    const type = String(event?.type ?? "");
    const session = (event?.data ?? {}) as OnvoSession;

    if (type !== "checkout-session.succeeded") {
      return new Response(JSON.stringify({ ignored: type }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row } = await admin
      .from("checkout_sessions")
      .select("*")
      .eq("onvo_session_id", session.id)
      .maybeSingle();

    if (!row) {
      console.error("ONVO webhook for unknown session", session.id);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: claim the row first. A duplicate delivery of the same event
    // finds nothing left to claim and does no work.
    const { data: claimed } = await admin
      .from("checkout_sessions")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .in("status", ["pending", "processing"])
      .select("id")
      .maybeSingle();

    if (!claimed) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paidMinor = Number(session.amountTotal ?? 0);
    if (paidMinor < row.amount_minor || session.currency !== row.currency) {
      console.error("ONVO webhook amount mismatch", { paidMinor, expected: row.amount_minor });
      await admin.from("checkout_sessions").update({ status: "failed" }).eq("id", row.id);
    } else {
      await activateSubscription(admin, row, session);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("onvo-webhook error:", error instanceof Error ? error.message : "unknown");
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
