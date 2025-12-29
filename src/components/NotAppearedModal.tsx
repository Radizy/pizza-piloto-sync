import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, AlertTriangle } from 'lucide-react';
import { Entregador } from '@/lib/api';

interface NotAppearedModalProps {
  open: boolean;
  entregador: Entregador | null;
  onClose: () => void;
  onNotAppeared: () => void;
  autoCloseMs?: number;
}

export function NotAppearedModal({
  open,
  entregador,
  onClose,
  onNotAppeared,
  autoCloseMs = 3000,
}: NotAppearedModalProps) {
  const [countdown, setCountdown] = useState(Math.ceil(autoCloseMs / 1000));

  useEffect(() => {
    if (!open) {
      setCountdown(Math.ceil(autoCloseMs / 1000));
      return;
    }

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, autoCloseMs);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(autoCloseTimer);
    };
  }, [open, autoCloseMs, onClose]);

  if (!entregador) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <div className="py-6">
          <div className="w-24 h-24 rounded-full bg-accent mx-auto mb-4 flex items-center justify-center glow-pulse">
            <User className="w-12 h-12 text-accent-foreground" />
          </div>

          <p className="text-muted-foreground mb-2">MOTOBOY CHAMADO</p>
          <h2 className="text-4xl font-bold font-mono text-accent mb-6">
            {entregador.nome.toUpperCase()}
          </h2>

          <DialogDescription className="sr-only">
            Modal de confirmação de chamada do motoboy
          </DialogDescription>

          <Button
            onClick={onNotAppeared}
            variant="destructive"
            size="lg"
            className="gap-2 text-lg px-8"
          >
            <AlertTriangle className="w-5 h-5" />
            NÃO APARECEU?
          </Button>

          <p className="text-sm text-muted-foreground mt-4">
            Fecha automaticamente em {countdown}s
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
