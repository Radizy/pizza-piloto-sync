import { Entregador } from '@/lib/api';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { UnitBadge } from './UnitSelector';
import { Phone, User, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

interface EntregadorCardProps {
  entregador: Entregador;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleAtivo?: () => void;
  showActions?: boolean;
  showUnit?: boolean;
  className?: string;
}

export function EntregadorCard({
  entregador,
  onEdit,
  onDelete,
  onToggleAtivo,
  showActions = true,
  showUnit = false,
  className,
}: EntregadorCardProps) {
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-lg p-4 transition-all hover:border-primary/50',
        !entregador.ativo && 'opacity-50',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {entregador.nome}
              </h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span>{entregador.telefone}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={entregador.status} size="sm" />
            {showUnit && <UnitBadge unit={entregador.unidade} />}
            {!entregador.ativo && (
              <span className="text-xs text-destructive font-medium px-2 py-0.5 bg-destructive/10 rounded">
                Inativo
              </span>
            )}
          </div>
        </div>

        {showActions && (
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleAtivo}
              className={cn(
                'p-2 rounded-lg transition-colors',
                entregador.ativo
                  ? 'text-primary hover:bg-primary/10'
                  : 'text-muted-foreground hover:bg-secondary'
              )}
              title={entregador.ativo ? 'Desativar' : 'Ativar'}
            >
              {entregador.ativo ? (
                <ToggleRight className="w-5 h-5" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onEdit}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
