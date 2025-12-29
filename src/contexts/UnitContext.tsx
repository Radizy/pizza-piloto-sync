import { createContext, useContext, useState, ReactNode } from 'react';
import { Unidade } from '@/lib/api';

interface UnitContextType {
  selectedUnit: Unidade | null;
  setSelectedUnit: (unit: Unidade | null) => void;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export function UnitProvider({ children }: { children: ReactNode }) {
  const [selectedUnit, setSelectedUnit] = useState<Unidade | null>(null);

  return (
    <UnitContext.Provider value={{ selectedUnit, setSelectedUnit }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
}
