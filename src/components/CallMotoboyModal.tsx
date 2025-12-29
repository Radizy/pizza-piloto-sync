import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Entregador } from '@/lib/api';

interface CallMotoboyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entregador: Entregador | null;
  onConfirm: (motivo: string) => void;
  isLoading?: boolean;
}

export function CallMotoboyModal({
  open,
  onOpenChange,
  entregador,
  onConfirm,
  isLoading
}: CallMotoboyModalProps) {
  const [motivo, setMotivo] = useState('');

  const handleConfirm = () => {
    if (!motivo.trim()) return;
    onConfirm(motivo);
    setMotivo('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chamar Motoboy</DialogTitle>
          <DialogDescription>
            Informe o motivo da chamada. Uma mensagem será enviada via WhatsApp.
          </DialogDescription>
        </DialogHeader>
        
        {entregador && (
          <div className="space-y-4 py-4">
            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="font-semibold text-lg">{entregador.nome}</p>
              <p className="text-sm text-muted-foreground">{entregador.telefone}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da chamada *</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: Entrega urgente, Pedido especial..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!motivo.trim() || isLoading}
          >
            {isLoading ? 'Enviando...' : 'Chamar Motoboy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
