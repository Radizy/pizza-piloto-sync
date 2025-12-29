import { Building2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { Unidade } from '@/lib/api';
import { toast } from 'sonner';

export function UnitSwitcher() {
  const { user, changeUnit } = useAuth();
  const { selectedUnit, setSelectedUnit } = useUnit();

  if (!user || !user.availableUnits || user.availableUnits.length <= 1) {
    return null;
  }

  const handleChangeUnit = async (unidade: Unidade) => {
    try {
      await changeUnit(unidade);
      setSelectedUnit(unidade);
      toast.success(`Unidade alterada para ${unidade}`);
    } catch (error) {
      toast.error('Erro ao trocar de unidade');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Building2 className="w-4 h-4" />
          <span>{selectedUnit}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {user.availableUnits.map((unit) => (
           <DropdownMenuItem
             key={unit.id}
             onClick={() => handleChangeUnit(unit.unidade_nome)}
             className="flex items-center justify-between cursor-pointer"
           >
             <div className="flex flex-col">
               <span className="font-medium">{unit.nome_loja}</span>
             </div>
             {selectedUnit === unit.unidade_nome && (
               <Check className="w-4 h-4 text-primary" />
             )}
           </DropdownMenuItem>
         ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
