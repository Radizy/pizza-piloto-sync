import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Store } from 'lucide-react';

export function WebhookConfig() {
  const { selectedUnit } = useUnit();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [nomeLoja, setNomeLoja] = useState('');

  // Config da unidade (apenas nome da loja)
  const { data: config, isLoading } = useQuery({
    queryKey: ['system-config', selectedUnit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('unidade', selectedUnit)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!selectedUnit,
  });

  useEffect(() => {
    if ((config as any)?.nome_loja) {
      setNomeLoja((config as any).nome_loja);
    } else {
      setNomeLoja('');
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async ({ loja }: { loja: string }) => {
      if (!selectedUnit) return;

      if (config) {
        const { error } = await supabase
          .from('system_config')
          .update({ nome_loja: loja } as any)
          .eq('id', (config as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_config')
          .insert({ unidade: selectedUnit, nome_loja: loja } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Nome da loja salvo com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao salvar nome da loja');
    },
  });

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold font-mono">Nome da Loja</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome-loja">Nome personalizado para esta unidade</Label>
          <div className="flex gap-2">
            <Input
              id="nome-loja"
              value={nomeLoja}
              onChange={(e) => setNomeLoja(e.target.value)}
              placeholder="Ex: Dom Fiorentino Itaquá"
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => saveMutation.mutate({ loja: nomeLoja })}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Este nome será exibido na tela da TV para esta unidade.
          </p>
        </div>
      </div>
    </div>
  );
}
