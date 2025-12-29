import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';

interface FranquiaBagsSectionProps {
  franquiaId: string;
}

interface FranquiaBagTipoRow {
  id: string;
  franquia_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

export const FranquiaBagsSection: React.FC<FranquiaBagsSectionProps> = ({ franquiaId }) => {
  const queryClient = useQueryClient();
  const [bagForm, setBagForm] = React.useState({ id: '', nome: '', descricao: '' });

  const { data: bagTipos = [], isLoading } = useQuery<FranquiaBagTipoRow[]>({
    queryKey: ['franquia-bag-tipos', franquiaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franquia_bag_tipos')
        .select('id, franquia_id, nome, descricao, ativo')
        .eq('franquia_id', franquiaId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as FranquiaBagTipoRow[];
    },
  });

  const upsertBagMutation = useMutation({
    mutationFn: async () => {
      const nome = bagForm.nome.trim();
      if (!nome) throw new Error('Nome do tipo de BAG é obrigatório');

      const payload = {
        franquia_id: franquiaId,
        nome,
        descricao: bagForm.descricao.trim() || null,
      };

      if (bagForm.id) {
        const { error } = await supabase
          .from('franquia_bag_tipos')
          .update(payload)
          .eq('id', bagForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('franquia_bag_tipos').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setBagForm({ id: '', nome: '', descricao: '' });
      queryClient.invalidateQueries({ queryKey: ['franquia-bag-tipos', franquiaId] });
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async (bag: FranquiaBagTipoRow) => {
      const { error } = await supabase
        .from('franquia_bag_tipos')
        .update({ ativo: !bag.ativo })
        .eq('id', bag.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franquia-bag-tipos', franquiaId] });
    },
  });

  const deleteBagMutation = useMutation({
    mutationFn: async (bag: FranquiaBagTipoRow) => {
      const { error } = await supabase
        .from('franquia_bag_tipos')
        .delete()
        .eq('id', bag.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franquia-bag-tipos', franquiaId] });
    },
  });

  const startEdit = (bag: FranquiaBagTipoRow) => {
    setBagForm({ id: bag.id, nome: bag.nome, descricao: bag.descricao || '' });
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm font-mono">Tipos de BAG da franquia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              upsertBagMutation.mutate();
            }}
            className="grid gap-4 md:grid-cols-3 items-end"
          >
            <div className="space-y-2">
              <Label>Nome do tipo</Label>
              <Input
                placeholder="Ex: BAG Normal, BAG Metro"
                value={bagForm.nome}
                onChange={(e) => setBagForm({ ...bagForm, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Descrição interna para identificação"
                value={bagForm.descricao}
                onChange={(e) => setBagForm({ ...bagForm, descricao: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={upsertBagMutation.isPending}>
              {bagForm.id ? 'Atualizar tipo' : 'Adicionar tipo'}
            </Button>
          </form>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando tipos de BAG...</p>
          ) : bagTipos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum tipo de BAG cadastrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {bagTipos.map((bag) => (
                <div
                  key={bag.id}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium cursor-pointer" onClick={() => startEdit(bag)}>
                      {bag.nome}
                    </p>
                    {bag.descricao && (
                      <p className="text-xs text-muted-foreground">{bag.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {bag.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <Switch
                      checked={bag.ativo}
                      onCheckedChange={() => toggleAtivoMutation.mutate(bag)}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => {
                        if (confirm(`Excluir o tipo de BAG "${bag.nome}"?`)) {
                          deleteBagMutation.mutate(bag);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
