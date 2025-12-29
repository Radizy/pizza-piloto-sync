import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Package, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Modulo {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
}

export function ModulosConfig() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
      return data as { config_pagamento: any } | null;
    },
    enabled: !!user?.franquiaId,
  });

  const modulosAtivos = (franquia?.config_pagamento as any)?.modulos_ativos || [];

  const tvPrompts = (franquia?.config_pagamento as any)?.tv_prompts || {
    entrega_chamada: 'É a sua vez {nome}',
    entrega_bag: 'Pegue a {bag}',
  };

  const savePromptsMutation = useMutation({
    mutationFn: async (payload: { entrega_chamada: string; entrega_bag: string }) => {
      if (!user?.franquiaId) return;
      const currentConfig = (franquia?.config_pagamento as any) || {};
      const newConfig = {
        ...currentConfig,
        tv_prompts: payload,
      };

      const { error } = await supabase
        .from('franquias')
        .update({ config_pagamento: newConfig })
        .eq('id', user.franquiaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franquia-modulos', user?.franquiaId] });
      toast.success('Textos da TV atualizados para a franquia!');
    },
    onError: () => {
      toast.error('Erro ao salvar textos da TV');
    },
  });
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
          Visualize os módulos ativos para sua franquia e ajuste as mensagens do módulo de TV.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
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
        </div>

        {user?.role === 'admin_franquia' && (
          <div className="mt-6 border-t border-border pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Textos da animação da TV (por franquia)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Use <code>{'{nome}'}</code> para o nome do motoboy e <code>{'{bag}'}</code> para o nome da bag.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tv-entrega-chamada">Frase de chamada</Label>
                <Input
                  id="tv-entrega-chamada"
                  defaultValue={tvPrompts.entrega_chamada}
                  onBlur={(e) =>
                    savePromptsMutation.mutate({
                      entrega_chamada: e.target.value || tvPrompts.entrega_chamada,
                      entrega_bag: tvPrompts.entrega_bag,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tv-entrega-bag">Frase da bag</Label>
                <Input
                  id="tv-entrega-bag"
                  defaultValue={tvPrompts.entrega_bag}
                  onBlur={(e) =>
                    savePromptsMutation.mutate({
                      entrega_chamada: tvPrompts.entrega_chamada,
                      entrega_bag: e.target.value || tvPrompts.entrega_bag,
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
