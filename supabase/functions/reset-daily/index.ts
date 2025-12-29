import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Iniciando reset diário às 15:00...');

    // Reset todos os motoboys para status disponível e ativo = false (para check-in)
    const { error: resetError } = await supabase
      .from('entregadores')
      .update({
        status: 'disponivel',
        ativo: false, // Força check-in no próximo dia
        hora_saida: null,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Atualiza todos

    if (resetError) {
      console.error('Erro ao resetar motoboys:', resetError);
      throw resetError;
    }

    // Limpar histórico de entregas do dia anterior
    const { error: deleteHistoricoError } = await supabase
      .from('historico_entregas')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

    if (deleteHistoricoError) {
      console.error('Erro ao limpar histórico:', deleteHistoricoError);
      // Não lança erro aqui, apenas loga
    } else {
      console.log('Histórico de entregas limpo com sucesso!');
    }

    console.log('Reset diário concluído com sucesso!');

    return new Response(
      JSON.stringify({ success: true, message: 'Reset diário executado com sucesso' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Erro no reset diário:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});