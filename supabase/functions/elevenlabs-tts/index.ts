import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text, voiceId, franquiaId } = await req.json()

    if (!text || !voiceId) {
      return new Response(
        JSON.stringify({ error: 'text e voiceId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    let elevenApiKey: string | null = null

    if (franquiaId && SUPABASE_URL && SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
        const { data, error } = await supabase
          .from('franquias')
          .select('config_pagamento')
          .eq('id', franquiaId)
          .maybeSingle()

        if (error) {
          console.error('Erro ao buscar config da franquia para ElevenLabs:', error)
        } else {
          const cfg = (data?.config_pagamento as any) || {}
          elevenApiKey = cfg?.tv_tts?.elevenlabs_api_key || cfg?.elevenlabs_api_key || null
        }
      } catch (e) {
        console.error('Erro ao inicializar cliente Supabase na função elevenlabs-tts:', e)
      }
    }

    // Fallback: usa chave global se configurada (ex: franquia padrão Dom Fiorentino)
    if (!elevenApiKey) {
      elevenApiKey = Deno.env.get('ELEVENLABS_API_KEY') ?? null
    }

    if (!elevenApiKey) {
      console.error('Nenhuma chave ElevenLabs configurada para esta franquia')
      return new Response(
        JSON.stringify({ error: 'ElevenLabs não configurado para esta franquia' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        output_format: 'mp3_44100_128',
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.4,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro ElevenLabs TTS:', response.status, errorText)
      return new Response(
        JSON.stringify({ error: 'Falha ao gerar áudio ElevenLabs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const audioBuffer = await response.arrayBuffer()

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Erro na função elevenlabs-tts:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno ao gerar áudio' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
