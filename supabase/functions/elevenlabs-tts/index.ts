import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text, voiceId } = await req.json()

    if (!text || !voiceId) {
      return new Response(
        JSON.stringify({ error: 'text e voiceId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')

    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY não configurada')
      return new Response(
        JSON.stringify({ error: 'Configuração de voz indisponível no momento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
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
