import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateGlobalConfig } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Settings } from 'lucide-react';

const GLOBAL_PASSWORD = 'SupAdmin3031';

interface GlobalConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSystemName: string;
}

export function GlobalConfigModal({ open, onOpenChange, currentSystemName }: GlobalConfigModalProps) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [newSystemName, setNewSystemName] = useState(currentSystemName);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setNewSystemName(currentSystemName);
      setIsAuthenticated(false);
    }
  }, [open, currentSystemName]);

  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      await updateGlobalConfig('system_name', name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-config'] });
      toast.success('Nome do sistema atualizado com sucesso!');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar nome do sistema');
    },
  });

  const handleAuthenticate = () => {
    if (password === GLOBAL_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      toast.error('Senha incorreta');
    }
  };

  const handleSave = () => {
    if (!newSystemName.trim()) {
      toast.error('Digite um nome para o sistema');
      return;
    }
    saveMutation.mutate(newSystemName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono">
            <Settings className="w-5 h-5" />
            Configuração Global
          </DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="global-password">Senha de Administrador</Label>
              <Input
                id="global-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha global"
                onKeyDown={(e) => e.key === 'Enter' && handleAuthenticate()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAuthenticate}>
                Autenticar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="system-name">Nome do Sistema</Label>
              <Input
                id="system-name"
                value={newSystemName}
                onChange={(e) => setNewSystemName(e.target.value)}
                placeholder="DeliveryOS"
              />
              <p className="text-sm text-muted-foreground">
                Este nome aparecerá na tela de login e na TV de todas as unidades.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Salvar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}