import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsappConfig {
  url: string;
  api_key: string;
  instance: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telefone, message, unidade_id, franquia_id } = await req.json();

    if (!telefone || !message) {
      return new Response(
        JSON.stringify({ error: 'telefone and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar configuração de WhatsApp: prioridade para unidade, depois franquia
    const projectUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!projectUrl || !serviceKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let whatsappConfig: WhatsappConfig | null = null;

    // 1) Tenta pegar config específica da unidade
    if (unidade_id) {
      const unidadeRes = await fetch(`${projectUrl}/rest/v1/unidades?id=eq.${unidade_id}&select=config_whatsapp,franquia_id`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });

      const unidadeData = await unidadeRes.json();
      const unidade = Array.isArray(unidadeData) ? unidadeData[0] : null;

      if (unidade?.config_whatsapp) {
        whatsappConfig = unidade.config_whatsapp as WhatsappConfig;
      }

      // Se não veio franquia_id no body, aproveita da unidade
      if (!franquia_id && unidade?.franquia_id) {
        (globalThis as any)._franquia_id_fallback = unidade.franquia_id;
      }
    }

    const effectiveFranquiaId = franquia_id || (globalThis as any)._franquia_id_fallback;

    // 2) Se não tiver config na unidade, busca na franquia
    if (!whatsappConfig && effectiveFranquiaId) {
      const franquiaRes = await fetch(`${projectUrl}/rest/v1/franquias?id=eq.${effectiveFranquiaId}&select=config_pagamento`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });

      const franquiaData = await franquiaRes.json();
      const franquia = Array.isArray(franquiaData) ? franquiaData[0] : null;

      if (franquia?.config_pagamento?.whatsapp) {
        whatsappConfig = franquia.config_pagamento.whatsapp as WhatsappConfig;
      }
    }

    if (!whatsappConfig) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp configuration not found for this unidade/franquia' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url: EVOLUTION_URL, api_key: EVOLUTION_API_KEY, instance: EVOLUTION_INSTANCE } = whatsappConfig;

    // Format phone number (remove non-digits and ensure country code)
    let formattedNumber = String(telefone).replace(/\D/g, '');
    if (!formattedNumber.startsWith('55')) {
      formattedNumber = '55' + formattedNumber;
    }

    const response = await fetch(
      `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: formattedNumber,
          text: message,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Evolution API error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to send message', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
