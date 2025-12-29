import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Entregador } from '@/lib/api';

interface ReturnToQueueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entregador: Entregador | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ReturnToQueueModal({
  open,
  onOpenChange,
  entregador,
  onConfirm,
  isLoading
}: ReturnToQueueModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voltar para Fila</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja retornar este motoboy para a fila de espera?
          </DialogDescription>
        </DialogHeader>
        
        {entregador && (
          <div className="py-4">
            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="font-semibold text-lg">{entregador.nome}</p>
              <p className="text-sm text-muted-foreground">{entregador.telefone}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Status atual: Em Entrega
              </p>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Processando...' : 'Voltar para Fila'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
