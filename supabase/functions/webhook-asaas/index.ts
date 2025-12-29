import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AsaasWebhookPayload {
  event: string;
  payment?: {
    id: string;
    value: number;
    status: string;
    dueDate?: string;
    externalReference?: string;
  };
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
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

    const url = new URL(req.url);
    const secretFromUrl = url.searchParams.get("secret");

    const payload = (await req.json()) as AsaasWebhookPayload;
    console.log("Webhook Asaas recebido:", JSON.stringify(payload));

    const payment = payload.payment;

    if (!payment || !payment.id || !payment.externalReference) {
      return new Response(JSON.stringify({ error: "Payload de pagamento inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const franquiaId = payment.externalReference;

    // Carrega franquia e configuração de pagamento para validar segredo e obter plano
    const { data: franquia, error: franquiaError } = await supabase
      .from("franquias")
      .select("id, config_pagamento")
      .eq("id", franquiaId)
      .maybeSingle();

    if (franquiaError || !franquia) {
      console.error("Franquia não encontrada para webhook:", franquiaError);
      return new Response(JSON.stringify({ error: "Franquia não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = (franquia.config_pagamento as any) || {};
    const webhookSecret = cfg.webhook_secret as string | undefined;
    const planoId = cfg.plano_id as string | undefined;

    // Validação básica de segredo via query string: ?secret=SEU_SEGREDO_FORTE
    if (webhookSecret && secretFromUrl !== webhookSecret) {
      console.warn("Segredo do webhook inválido para franquia", franquiaId);
      return new Response(JSON.stringify({ error: "Segredo inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualiza/insere o registro da cobrança
    const cobrancaStatus = payment.status ?? "PENDING";

    const { error: upsertError } = await supabase.from("franquia_cobrancas").upsert(
      {
        franquia_id: franquiaId,
        gateway: "asas",
        external_id: payment.id,
        status: cobrancaStatus,
        valor: payment.value,
        vencimento: payment.dueDate ? new Date(payment.dueDate).toISOString() : null,
        payload,
      },
      {
        onConflict: "gateway,external_id",
      },
    );

    if (upsertError) {
      console.error("Erro ao registrar cobrança no webhook:", upsertError);
    }

    // Se o pagamento foi confirmado/recebido, renovar automaticamente a franquia
    const statusNormalizado = cobrancaStatus.toUpperCase();
    const isPago =
      statusNormalizado === "RECEIVED" ||
      statusNormalizado === "CONFIRMED" ||
      statusNormalizado === "RECEIVED_IN_CASH";

    if (isPago) {
      let novaDataVencimento: Date | null = null;

      if (planoId) {
        const { data: plano, error: planoError } = await supabase
          .from("planos")
          .select("duracao_meses")
          .eq("id", planoId)
          .maybeSingle();

        if (planoError) {
          console.error("Erro ao buscar plano no webhook:", planoError);
        }

        const meses = plano?.duracao_meses ?? 1;
        novaDataVencimento = addMonths(new Date(), meses);
      } else {
        // fallback: adiciona 1 mês
        novaDataVencimento = addMonths(new Date(), 1);
      }

      const { error: updateFranquiaError } = await supabase
        .from("franquias")
        .update({
          status_pagamento: "ativo",
          data_vencimento: novaDataVencimento ? novaDataVencimento.toISOString().slice(0, 10) : null,
        })
        .eq("id", franquiaId);

      if (updateFranquiaError) {
        console.error("Erro ao atualizar franquia no webhook:", updateFranquiaError);
      } else {
        console.log("Franquia atualizada como ativa com nova data de vencimento");
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na função webhook-asaas:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
