import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find active client invite
    const { data: invite, error: invErr } = await supabase
      .from("client_invites")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("active", true)
      .single();

    if (invErr || !invite) {
      return new Response(JSON.stringify({ error: "Invalid or expired invite code" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check max uses
    if (invite.max_uses && invite.used_count >= invite.max_uses) {
      return new Response(JSON.stringify({ error: "Invite code has reached max uses" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Invite code has expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update user profile to join org
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ org_id: invite.org_id })
      .eq("id", user.id);

    if (profileErr) throw profileErr;

    // Add client role
    const { error: roleErr } = await supabase
      .from("user_roles")
      .upsert({ user_id: user.id, role: "client" }, { onConflict: "user_id,role" });

    if (roleErr) throw roleErr;

    // Create client_access record with permissions from invite
    const { error: accessErr } = await supabase
      .from("client_access")
      .upsert({
        client_user_id: user.id,
        estate_id: invite.estate_id,
        org_id: invite.org_id,
        granted_by: invite.invited_by,
        can_view_map: invite.can_view_map,
        can_view_assets: invite.can_view_assets,
        can_view_tasks: invite.can_view_tasks,
        can_view_reports: invite.can_view_reports,
        can_view_photos: invite.can_view_photos,
        can_view_documents: invite.can_view_documents,
        can_view_work_hours: invite.can_view_work_hours,
        can_view_statistics: invite.can_view_statistics,
      }, { onConflict: "client_user_id,estate_id" });

    if (accessErr) throw accessErr;

    // Increment used_count
    await supabase
      .from("client_invites")
      .update({ used_count: invite.used_count + 1 })
      .eq("id", invite.id);

    return new Response(
      JSON.stringify({ success: true, org_id: invite.org_id, estate_id: invite.estate_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error joining as client:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
