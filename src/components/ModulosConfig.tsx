import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Package } from 'lucide-react';

interface Modulo {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
}

export function ModulosConfig() {
  const { user } = useAuth();

  // Buscar módulos globais
  const { data: modulos = [], isLoading: loadingModulos } = useQuery<Modulo[]>({
    queryKey: ['modulos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modulos')
        .select('id, codigo, nome, descricao')
        .eq('ativo', true);
      if (error) throw error;
      return data as Modulo[];
    },
  });

  // Buscar módulos ativos da franquia
  const { data: franquia, isLoading: loadingFranquia } = useQuery({
    queryKey: ['franquia-modulos', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return null;
      const { data, error } = await supabase
        .from('franquias')
        .select('config_pagamento')
        .eq('id', user.franquiaId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.franquiaId,
  });

  const modulosAtivos = (franquia?.config_pagamento as any)?.modulos_ativos || [];

  if (loadingModulos || loadingFranquia) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Módulos opcionais
        </CardTitle>
        <CardDescription>
          Visualize os módulos ativos para sua franquia (configurados pelo super admin)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {modulos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum módulo opcional disponível no momento.
          </p>
        ) : (
          modulos.map((m) => {
            const ativo = modulosAtivos.includes(m.codigo);
            return (
              <div
                key={m.id}
                className="flex items-center justify-between border border-border rounded-lg p-4"
              >
                <div className="flex-1">
                  <Label className="font-semibold">{m.nome}</Label>
                  {m.descricao && (
                    <p className="text-xs text-muted-foreground mt-1">{m.descricao}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Código: {m.codigo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${ativo ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <Switch checked={ativo} disabled />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
