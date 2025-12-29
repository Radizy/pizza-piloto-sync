import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CriarCobrancaPayload {
  franquiaId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Variáveis de ambiente do backend não configuradas");
      return new Response(JSON.stringify({ error: "Configuração do backend ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = (await req.json()) as CriarCobrancaPayload;

    if (!body?.franquiaId) {
      return new Response(JSON.stringify({ error: "franquiaId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega dados da franquia, incluindo configuração de pagamento
    const { data: franquia, error: franquiaError } = await supabase
      .from("franquias")
      .select("id, nome_franquia, config_pagamento")
      .eq("id", body.franquiaId)
      .maybeSingle();

    if (franquiaError || !franquia) {
      console.error("Erro ao buscar franquia:", franquiaError);
      return new Response(JSON.stringify({ error: "Franquia não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = (franquia.config_pagamento as any) || {};
    const provider = cfg.provider as string | undefined;
    const apiKey = cfg.api_key as string | undefined;
    const customerId = cfg.customer_id as string | undefined;
    const planoId = cfg.plano_id as string | undefined;
    const valorPlanoConfig = cfg.valor_plano as number | undefined;

    if (!provider || !apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Configuração de pagamento incompleta. Defina o gateway e a API Key na tela de Franquias.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!customerId && provider === "asas") {
      return new Response(
        JSON.stringify({
          error:
            "Para Asaas, é necessário informar o customer_id na configuração de pagamento da franquia.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Busca plano para determinar valor e duração, se necessário
    let valorCobranca: number | null = valorPlanoConfig ?? null;

    if (!valorCobranca && planoId) {
      const { data: plano, error: planoError } = await supabase
        .from("planos")
        .select("valor_base")
        .eq("id", planoId)
        .maybeSingle();

      if (planoError) {
        console.error("Erro ao buscar plano:", planoError);
      }

      if (plano?.valor_base != null) {
        valorCobranca = Number(plano.valor_base);
      }
    }

    if (!valorCobranca || valorCobranca <= 0) {
      return new Response(
        JSON.stringify({
          error:
            "Valor do plano não configurado. Defina o valor do plano na tela de Franquias ou no cadastro do plano.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let checkoutUrl: string | null = null;
    let externalId: string | null = null;

    if (provider === "asas") {
      // Cria cobrança no Asaas usando billingType PIX, mas aproveitando a página padrão do Asaas
      const asaasBaseUrl = "https://api.asaas.com/v3";

      const payload = {
        customer: customerId,
        billingType: "PIX",
        value: valorCobranca,
        dueDate: new Date().toISOString().slice(0, 10),
        description: `Renovação da franquia ${franquia.nome_franquia}`,
        externalReference: franquia.id,
      };

      const asaasResponse = await fetch(`${asaasBaseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!asaasResponse.ok) {
        const errorBody = await asaasResponse.text();
        console.error("Erro ao criar cobrança no Asaas:", errorBody);
        return new Response(JSON.stringify({ error: "Erro ao criar cobrança no Asaas" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const asaasData = await asaasResponse.json();
      externalId = asaasData.id as string;
      checkoutUrl =
        (asaasData.invoiceUrl as string | undefined) || (asaasData.bankSlipUrl as string | undefined) || null;

      // Registra cobrança localmente
      if (externalId) {
        const { error: insertError } = await supabase.from("franquia_cobrancas").insert({
          franquia_id: franquia.id,
          gateway: "asas",
          external_id: externalId,
          status: asaasData.status ?? "PENDING",
          valor: valorCobranca,
          vencimento: asaasData.dueDate ? new Date(asaasData.dueDate).toISOString() : null,
          payload: asaasData,
        });

        if (insertError) {
          console.error("Erro ao registrar cobrança localmente:", insertError);
        }
      }
    } else if (provider === "seabra") {
      // Aqui entraria a chamada real para o gateway Seabra.
      // Como as APIs variam entre clientes, deixamos o comportamento como genérico.
      console.log("Gateway Seabra configurado, mas integração direta ainda não implementada.");
      return new Response(
        JSON.stringify({
          error:
            "Integração direta com Seabra ainda não implementada. Use Asaas ou entre em contato com o suporte.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } else {
      return new Response(JSON.stringify({ error: "Gateway de pagamento não suportado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!checkoutUrl) {
      return new Response(
        JSON.stringify({
          error:
            "Cobrança criada, mas o gateway não retornou uma URL de pagamento. Verifique o painel do gateway.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ checkoutUrl, externalId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na função criar-cobranca-franquia:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
