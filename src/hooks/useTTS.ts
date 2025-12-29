import { useCallback, useRef } from 'react';

export function useTTS() {
  const speakingRef = useRef(false);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        console.warn('TTS não suportado neste navegador');
        resolve();
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a Portuguese Brazilian female voice
      const voices = window.speechSynthesis.getVoices();
      const ptBrVoice = voices.find(
        (voice) =>
          (voice.lang === 'pt-BR' || voice.lang.startsWith('pt')) &&
          voice.name.toLowerCase().includes('female')
      ) ||
        voices.find((voice) => voice.lang === 'pt-BR' || voice.lang.startsWith('pt')) ||
        voices[0];

      if (ptBrVoice) {
        utterance.voice = ptBrVoice;
      }

      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 1;

      speakingRef.current = true;

      utterance.onend = () => {
        speakingRef.current = false;
        resolve();
      };

      utterance.onerror = (event) => {
        speakingRef.current = false;
        console.error('TTS error:', event);
        resolve(); // Resolve anyway to not block flow
      };

      // Some browsers need voices to be loaded first
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          const newVoices = window.speechSynthesis.getVoices();
          const newPtBrVoice = newVoices.find(
            (voice) => voice.lang === 'pt-BR' || voice.lang.startsWith('pt')
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
  }, []);

  const cancel = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      speakingRef.current = false;
    }
  }, []);

  return { speak, cancel, isSpeaking: () => speakingRef.current };
}
