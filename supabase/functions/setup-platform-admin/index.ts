import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const adminEmail = "wolfgang@novasilva.co";
    const adminPassword = "demo123456";

    // Check if user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === adminEmail
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log("Admin user already exists:", userId);
    } else {
      // Create the admin user
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
          user_metadata: { full_name: "Wolfgang" },
        });

      if (createError) throw createError;
      userId = newUser.user.id;
      console.log("Created admin user:", userId);
    }

    // Ensure profile exists
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      await supabaseAdmin.from("profiles").insert({
        id: userId,
        email: adminEmail,
        full_name: "Wolfgang",
        preferred_language: "en",
      });
    } else {
      await supabaseAdmin
        .from("profiles")
        .update({ full_name: "Wolfgang", email: adminEmail })
        .eq("id", userId);
    }

    // Ensure owner role
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "owner")
      .maybeSingle();

    if (!existingRole) {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "owner" });
    }

    // Ensure platform admin
    const { data: existingAdmin } = await supabaseAdmin
      .from("platform_admins")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingAdmin) {
      await supabaseAdmin
        .from("platform_admins")
        .insert({ user_id: userId });
    }

    // Create NovaSilva org if needed
    let orgId: string;
    const { data: existingOrg } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("name", "NovaSilva")
      .maybeSingle();

    if (existingOrg) {
      orgId = existingOrg.id;
    } else {
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({ name: "NovaSilva" })
        .select("id")
        .single();

      if (orgError) throw orgError;
      orgId = newOrg.id;
    }

    // Link profile to org
    await supabaseAdmin
      .from("profiles")
      .update({ org_id: orgId })
      .eq("id", userId);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        orgId,
        message: "Platform admin wolfgang@novasilva.co created successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
