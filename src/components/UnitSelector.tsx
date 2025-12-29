import { Unidade } from '@/lib/api';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface UnitSelectorProps {
  value: Unidade | null;
  onChange: (unit: Unidade) => void;
  className?: string;
}

const units: { value: Unidade; label: string; color: string }[] = [
  { value: 'ITAQUA', label: 'Itaquaquecetuba', color: 'unit-badge-itaqua' },
  { value: 'POA', label: 'Poá', color: 'unit-badge-poa' },
  { value: 'SUZANO', label: 'Suzano', color: 'unit-badge-suzano' },
];

export function UnitSelector({ value, onChange, className }: UnitSelectorProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      {units.map((unit) => (
        <button
          key={unit.value}
          onClick={() => onChange(unit.value)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200',
            'hover:scale-105 active:scale-95',
            value === unit.value
              ? cn(unit.color, 'border-current shadow-lg')
              : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
          )}
        >
          <MapPin className="w-4 h-4" />
          <span className="font-medium">{unit.label}</span>
        </button>
      ))}
    </div>
  );
}

export function UnitBadge({ unit }: { unit: Unidade }) {
  const unitConfig = units.find((u) => u.value === unit);
  if (!unitConfig) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border',
        unitConfig.color
      )}
    >
      <MapPin className="w-3 h-3" />
      {unit}
    </span>
  );
}
