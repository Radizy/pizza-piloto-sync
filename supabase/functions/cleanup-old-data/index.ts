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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log("Running cleanup-old-data with cutoff", cutoff);

    const tables = [
      "historico_entregas",
      "logs_auditoria",
      "whatsapp_historico",
      "senhas_pagamento",
    ] as const;

    const results: Record<string, { error: unknown | null }> = {};

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .lt("created_at", cutoff);

      if (error) {
        console.error(`Error cleaning ${table}:`, error);
        results[table] = { error };
      } else {
        results[table] = { error: null };
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error in cleanup-old-data:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
