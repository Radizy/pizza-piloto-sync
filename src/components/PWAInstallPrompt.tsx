import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    
    setIsIOS(isIOSDevice);

    // Se já está em modo standalone, não mostrar
    if (isInStandaloneMode) {
      return;
    }

    // Para iOS, sempre mostrar instruções
    if (isIOSDevice) {
      // Verificar se já foi descartado
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
      return;
    }

    // Para Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-card border border-border rounded-xl p-4 shadow-lg z-50 animate-slide-in">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold mb-1">Adicionar à Tela Inicial</h3>
          
          {isIOS ? (
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Para instalar o app:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Toque no botão <strong>Compartilhar</strong> (📤)</li>
                <li>Role e toque em <strong>Adicionar à Tela de Início</strong></li>
              </ol>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Instale o app para acesso rápido e experiência completa.
              </p>
              <Button onClick={handleInstall} size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Instalar App
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
