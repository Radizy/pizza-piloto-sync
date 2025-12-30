import { useCallback, useRef, useEffect } from 'react';

export type TTSVoiceModel =
  | 'system'
  | 'browser_default'
  | 'browser_clara'
  | 'browser_grave'
  | 'browser_suave'
  | 'browser_enfatico'
  | 'browser_lento'
  | 'browser_rapido'
  | 'google_tts'
  | 'elevenlabs_voz_1'
  | 'elevenlabs_voz_2'
  | 'elevenlabs_voz_3';

export interface TTSConfig {
  enabled: boolean;
  volume: number; // 0-100
  voice_model: TTSVoiceModel;
}

const DEFAULT_TTS_CONFIG: TTSConfig = {
  enabled: true,
  volume: 100,
  voice_model: 'system',
};

function normalizeConfig(config?: Partial<TTSConfig> | null): TTSConfig {
  return {
    enabled: config?.enabled ?? DEFAULT_TTS_CONFIG.enabled,
    volume: Math.min(100, Math.max(0, config?.volume ?? DEFAULT_TTS_CONFIG.volume)),
    voice_model: (config?.voice_model as TTSVoiceModel) ?? DEFAULT_TTS_CONFIG.voice_model,
  };
}

export function useTTS(initialConfig?: Partial<TTSConfig> | null) {
  const speakingRef = useRef(false);
  const configRef = useRef<TTSConfig>(normalizeConfig(initialConfig));
  const googleAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sempre manter a configuração mais recente em memória para chamadas futuras
  useEffect(() => {
    configRef.current = normalizeConfig(initialConfig);
  }, [initialConfig]);

  const speak = useCallback(
    (text: string, overrideConfig?: Partial<TTSConfig> | null): Promise<void> => {
      return new Promise(async (resolve) => {
        const activeConfig = normalizeConfig(overrideConfig ?? configRef.current);

        if (!activeConfig.enabled) {
          resolve();
          return;
        }

        // Limitar tamanho do texto para evitar áudios muito longos (aprox. 15s)
        const safeText = text.slice(0, 260);

        // Cancelar qualquer fala ou áudio em andamento
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        if (googleAudioRef.current) {
          googleAudioRef.current.pause();
          googleAudioRef.current.currentTime = 0;
          googleAudioRef.current = null;
        }

        // Implementação especial para ElevenLabs TTS (vozes mais humanas)
        if (activeConfig.voice_model.startsWith('elevenlabs_')) {
          const voiceIdMap: Record<string, string> = {
            elevenlabs_voz_1: 'XrExE9yKIg1WjnnlVkGX', // Matilda - voz mais suave
            elevenlabs_voz_2: 'SAz9YHcvj6GT2YYXdXww', // River - voz mais jovem
            elevenlabs_voz_3: 'TX3LPaxmHKxFdv7VOQHJ', // Liam - voz mais neutra
          };

          const voiceId = voiceIdMap[activeConfig.voice_model];

          if (!voiceId) {
            console.warn('Modelo ElevenLabs desconhecido, usando fallback do navegador');
          } else {
            try {
              const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                  },
                  body: JSON.stringify({ text: safeText, voiceId }),
                },
              );

              if (!response.body || !response.ok) {
                console.error('Falha ao chamar ElevenLabs TTS');
              } else {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                googleAudioRef.current = audio;
                audio.volume = activeConfig.volume / 100;
                speakingRef.current = true;

                audio.onended = () => {
                  speakingRef.current = false;
                  URL.revokeObjectURL(url);
                };

                audio.onerror = (err) => {
                  console.error('Erro ao tocar áudio ElevenLabs', err);
                  speakingRef.current = false;
                  URL.revokeObjectURL(url);
                };

                await audio.play().catch((err) => {
                  console.error('Erro ao iniciar áudio ElevenLabs', err);
                  speakingRef.current = false;
                  URL.revokeObjectURL(url);
                });

                resolve();
                return;
              }
            } catch (err) {
              console.error('Falha no ElevenLabs TTS, seguindo sem áudio', err);
            }
          }
          // Se cair aqui, faz fallback para implementação padrão do navegador
        }

        // Implementação especial para Google Translate TTS
        if (activeConfig.voice_model === 'google_tts') {
          try {
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=tw-ob&q=${encodeURIComponent(
              safeText,
            )}`;
            const audio = new Audio(url);
            googleAudioRef.current = audio;
            audio.volume = activeConfig.volume / 100;
            speakingRef.current = true;

            audio.onended = () => {
              speakingRef.current = false;
              resolve();
            };

            audio.onerror = () => {
              console.error('Erro ao tocar áudio do Google TTS');
              speakingRef.current = false;
              resolve();
            };

            audio.play().catch((err) => {
              console.error('Erro ao iniciar áudio do Google TTS', err);
              speakingRef.current = false;
              resolve();
            });
          } catch (err) {
            console.error('Falha no Google TTS, seguindo sem áudio', err);
            resolve();
          }

          return;
        }

        // Fallback para SpeechSynthesis do navegador (com múltiplos perfis)
        if (!window.speechSynthesis) {
          console.warn('TTS não suportado neste navegador');
          resolve();
          return;
        }

        const voices = window.speechSynthesis.getVoices();
        const utterance = new SpeechSynthesisUtterance(safeText);

        // Reaproveita a lógica atual como "system" (fallback do sistema)
        if (activeConfig.voice_model === 'system') {
          const ptBrVoice =
            voices.find(
              (voice) =>
                (voice.lang === 'pt-BR' || voice.lang.startsWith('pt')) &&
                voice.name.toLowerCase().includes('female'),
            ) ||
            voices.find((voice) => voice.lang === 'pt-BR' || voice.lang.startsWith('pt')) ||
            voices[0];

          if (ptBrVoice) {
            utterance.voice = ptBrVoice;
          }

          utterance.lang = 'pt-BR';
          utterance.rate = 0.9;
          utterance.pitch = 1.1;
        } else {
          // Perfis ajustados conforme especificação, tentando sempre voz brasileira
          const preferredVoice =
            voices.find(
              (voice) =>
                (voice.lang === 'pt-BR' || voice.lang.startsWith('pt')) &&
                /brazil|brasil/i.test(voice.name),
            ) ||
            voices.find((voice) => voice.lang === 'pt-BR' || voice.lang.startsWith('pt')) ||
            voices[0];

          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }

          utterance.lang = 'pt-BR';

          if (activeConfig.voice_model === 'browser_default') {
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
          } else if (activeConfig.voice_model === 'browser_clara') {
            utterance.rate = 0.9;
            utterance.pitch = 1.1;
          } else if (activeConfig.voice_model === 'browser_grave') {
            utterance.rate = 0.95;
            utterance.pitch = 0.85;
          } else if (activeConfig.voice_model === 'browser_suave') {
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
          } else if (activeConfig.voice_model === 'browser_enfatico') {
            utterance.rate = 1.05;
            utterance.pitch = 1.1;
          } else if (activeConfig.voice_model === 'browser_lento') {
            utterance.rate = 0.8;
            utterance.pitch = 0.95;
          } else if (activeConfig.voice_model === 'browser_rapido') {
            utterance.rate = 1.15;
            utterance.pitch = 1.0;
          }
        }

        utterance.volume = activeConfig.volume / 100;
        speakingRef.current = true;

        utterance.onend = () => {
          speakingRef.current = false;
          resolve();
        };

        utterance.onerror = (event) => {
          speakingRef.current = false;
          console.error('TTS error:', event);
          resolve(); // Resolve mesmo em erro para não travar o fluxo
        };

        if (voices.length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            const newVoices = window.speechSynthesis.getVoices();
            const newPtBrVoice = newVoices.find(
              (voice) => voice.lang === 'pt-BR' || voice.lang.startsWith('pt'),
            );
            if (newPtBrVoice) {
              utterance.voice = newPtBrVoice;
            }
            window.speechSynthesis.speak(utterance);
          };
        } else {
          window.speechSynthesis.speak(utterance);
        }
      });
    },
    [],
  );

  const cancel = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (googleAudioRef.current) {
      googleAudioRef.current.pause();
      googleAudioRef.current.currentTime = 0;
      googleAudioRef.current = null;
    }
    speakingRef.current = false;
  }, []);

  return { speak, cancel, isSpeaking: () => speakingRef.current };
}
