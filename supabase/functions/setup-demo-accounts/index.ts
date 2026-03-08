import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Demo accounts to create
    const demoAccounts = [
      { email: 'owner@demo.com', password: 'Demo1234!', fullName: 'Demo Owner', role: 'owner', language: 'en' },
      { email: 'manager@demo.com', password: 'Demo1234!', fullName: 'Demo Manager', role: 'manager', language: 'en' },
      { email: 'crew@demo.com', password: 'Demo1234!', fullName: 'Demo Crew', role: 'crew', language: 'es' },
      { email: 'vendor@demo.com', password: 'Demo1234!', fullName: 'Demo Vendor', role: 'vendor', language: 'es' },
    ];

    const results = [];

    // Get the demo organization
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('name', 'Bahia Vista Holdings')  // Demo org
      .single();

    const orgId = orgData?.id;

    for (const account of demoAccounts) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === account.email);

      if (existingUser) {
        // Update profile with org_id if needed
        if (orgId) {
          await supabaseAdmin
            .from('profiles')
            .update({ org_id: orgId, preferred_language: account.language })
            .eq('id', existingUser.id);
        }
        
        // Ensure role exists
        const { data: existingRole } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', existingUser.id)
          .eq('role', account.role)
          .maybeSingle();

        if (!existingRole) {
          await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: existingUser.id, role: account.role });
        }

        results.push({ email: account.email, status: 'exists', updated: true });
        continue;
      }

      // Create user
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.fullName,
        },
      });

      if (userError) {
        results.push({ email: account.email, status: 'error', error: userError.message });
        continue;
      }

      // Update profile with org_id
      if (userData.user && orgId) {
        await supabaseAdmin
          .from('profiles')
          .update({ 
            org_id: orgId, 
            preferred_language: account.language,
            full_name: account.fullName 
          })
          .eq('id', userData.user.id);

        // Create role
        await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userData.user.id, role: account.role });
      }

      results.push({ email: account.email, status: 'created' });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
