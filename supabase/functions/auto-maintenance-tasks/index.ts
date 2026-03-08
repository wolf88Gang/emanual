import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Find assets with no service in 30+ days across all estates
    const { data: assets, error: assetsErr } = await supabase
      .from("assets")
      .select("id, name, estate_id, asset_type, last_service_date")
      .or(`last_service_date.is.null,last_service_date.lt.${thirtyDaysAgo.toISOString().split("T")[0]}`);

    if (assetsErr) throw assetsErr;

    let tasksCreated = 0;

    for (const asset of assets || []) {
      // Check if there's already a pending/in_progress task for this asset
      const { data: existingTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("asset_id", asset.id)
        .in("status", ["pending", "in_progress"])
        .limit(1);

      if (existingTasks && existingTasks.length > 0) continue;

      const daysSinceService = asset.last_service_date
        ? Math.floor((now.getTime() - new Date(asset.last_service_date).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const priority = daysSinceService > 90 ? 1 : daysSinceService > 60 ? 2 : 3;

      const { error: insertErr } = await supabase.from("tasks").insert({
        estate_id: asset.estate_id,
        asset_id: asset.id,
        title: `Maintenance check: ${asset.name}`,
        title_es: `Revisión de mantenimiento: ${asset.name}`,
        description: `Auto-generated: This asset has not been serviced in ${daysSinceService} days.`,
        description_es: `Auto-generada: Este activo no ha recibido servicio en ${daysSinceService} días.`,
        priority,
        frequency: "once",
        due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: "pending",
      });

      if (!insertErr) tasksCreated++;
    }

    return new Response(
      JSON.stringify({ success: true, tasksCreated, assetsChecked: assets?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in auto-maintenance:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
