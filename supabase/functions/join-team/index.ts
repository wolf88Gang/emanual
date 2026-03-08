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

    // Get the user from the auth header
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

    // Find active invite
    const { data: invite, error: invErr } = await supabase
      .from("team_invites")
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
    if (invite.used_count >= invite.max_uses) {
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

    // Add role
    const { error: roleErr } = await supabase
      .from("user_roles")
      .upsert({ user_id: user.id, role: invite.role }, { onConflict: "user_id,role" });

    if (roleErr) throw roleErr;

    // Add to team_members if not already there
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("org_id", invite.org_id)
      .eq("user_id", user.id)
      .limit(1);

    if (!existingMember || existingMember.length === 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      await supabase.from("team_members").insert({
        org_id: invite.org_id,
        estate_id: invite.estate_id,
        user_id: user.id,
        full_name: profile?.full_name || profile?.email || "Worker",
        role: invite.role,
      });
    }

    // Increment used_count
    await supabase
      .from("team_invites")
      .update({ used_count: invite.used_count + 1 })
      .eq("id", invite.id);

    return new Response(
      JSON.stringify({ success: true, org_id: invite.org_id, role: invite.role }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error joining team:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
