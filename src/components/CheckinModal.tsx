import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, User, LogIn } from 'lucide-react';
import { Entregador } from '@/lib/api';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CheckinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entregadores: Entregador[];
  onCheckin: (entregador: Entregador) => Promise<void>;
  isLoading: boolean;
}

// Verifica se já fez check-in hoje (reseta às 03:00)
function hasCheckedInToday(entregador: Entregador): boolean {
  // Se está ativo e tem uma posição na fila, já fez check-in
  if (entregador.ativo && (entregador.status === 'disponivel' || entregador.status === 'chamado' || entregador.status === 'entregando')) {
    return true;
  }
  return false;
}

export function CheckinModal({
  open,
  onOpenChange,
  entregadores,
  onCheckin,
  isLoading,
}: CheckinModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  // Filtrar apenas motoboys que ainda não fizeram check-in hoje
  const availableForCheckin = useMemo(() => {
    return entregadores.filter((e) => {
      // Só mostra quem ainda não fez check-in (não está ativo ou não está na fila)
      const alreadyCheckedIn = hasCheckedInToday(e);
      return !alreadyCheckedIn;
    });
  }, [entregadores]);

  const filteredEntregadores = availableForCheckin.filter((e) =>
    e.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCheckin = async (entregador: Entregador) => {
    setCheckingIn(entregador.id);
    try {
      await onCheckin(entregador);
    } finally {
      setCheckingIn(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="font-mono text-2xl flex items-center gap-2">
            <LogIn className="w-6 h-6 text-primary" />
            Entrar na Fila
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar motoboy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntregadores.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Todos os motoboys já entraram na fila</p>
              <p className="text-sm mt-2">A lista reseta às 03:00</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntregadores.map((entregador) => (
                <Button
                  key={entregador.id}
                  onClick={() => handleCheckin(entregador)}
                  disabled={checkingIn === entregador.id}
                  variant="outline"
                  className="w-full justify-start gap-3 h-16 text-lg hover:bg-primary/10 hover:border-primary"
                >
                  {checkingIn === entregador.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <span className="flex-1 text-left font-semibold">
                    {entregador.nome}
                  </span>
                  <LogIn className="w-5 h-5 text-primary" />
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Clique no seu nome para entrar na fila. Válido apenas para a primeira entrada do dia.
        </p>
      </DialogContent>
    </Dialog>
  );
}
