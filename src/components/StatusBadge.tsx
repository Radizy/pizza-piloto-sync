import { Status } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CheckCircle, Phone, Truck } from 'lucide-react';

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<Status, { label: string; icon: typeof CheckCircle; className: string }> = {
  disponivel: {
    label: 'Disponível',
    icon: CheckCircle,
    className: 'status-available',
  },
  chamado: {
    label: 'Chamado',
    icon: Phone,
    className: 'status-called',
  },
  entregando: {
    label: 'Entregando',
    icon: Truck,
    className: 'status-delivering',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-3 py-1 text-sm gap-1.5',
  lg: 'px-4 py-2 text-base gap-2',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        config.className,
        sizeClasses[size]
      )}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </span>
  );
}
