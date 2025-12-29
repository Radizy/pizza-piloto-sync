import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Layout, BackButton } from '@/components/Layout';
import {
  gerarSenhaPagamento,
  fetchSenhasPagamento,
  atenderSenhaPagamento,
  chamarSenhaPagamento,
  SenhaPagamento,
  fetchEntregadores,
  shouldShowInQueue,
  Entregador,
  Unidade,
} from '@/lib/api';
import { toast } from 'sonner';
import { Ticket, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function FilaPagamento() {
  const { selectedUnit } = useUnit();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Motoboys aptos a receber hoje: apenas disponivel (não entregando)
  const { data: entregadores = [] } = useQuery<Entregador[]>({
    queryKey: ['entregadores-pagamento', selectedUnit],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit as Unidade }),
    enabled: !!selectedUnit,
    refetchInterval: 10000,
  });

  const motoboysAptos = entregadores.filter((e) => {
    const ativo = e.ativo;
    const disponivel = e.status === 'disponivel';

    // mesma regra de visibilidade da TV: horário/dia ou check-in recente
    const hasRecentCheckin = (() => {
      if (!e.fila_posicao) return false;
      const now = new Date().getTime();
      const filaTime = new Date(e.fila_posicao).getTime();
      const diffHours = (now - filaTime) / (1000 * 60 * 60);
      return diffHours <= 24;
    })();

    return ativo && disponivel && (shouldShowInQueue(e) || hasRecentCheckin);
  });

  // Buscar senhas ativas
  const { data: senhas = [], isLoading } = useQuery({
    queryKey: ['senhas-pagamento', user?.unidadeId],
    queryFn: () => fetchSenhasPagamento(user!.unidadeId!),
    enabled: !!user?.unidadeId,
    refetchInterval: 5000,
  });

  // Mutation para atender senha (marcar como pago)
  const atenderMutation = useMutation({
    mutationFn: (senhaId: string) => atenderSenhaPagamento(senhaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['senhas-pagamento'] });
      toast.success('Pagamento concluído!');
    },
    onError: () => {
      toast.error('Erro ao marcar como pago');
    },
  });

  // Mutation para chamar senha (mostrar na TV)
  const chamarMutation = useMutation({
    mutationFn: (senhaId: string) => chamarSenhaPagamento(senhaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['senhas-pagamento'] });
      toast.success('Motoboy chamado para receber');
    },
    onError: () => {
      toast.error('Erro ao chamar para receber');
    },
  });

  const senhasPendentes = senhas.filter((s) => s.status === 'aguardando' || s.status === 'chamado');
  const senhasPagas = senhas.filter((s) => s.status === 'atendido');

  // Motoboys que ainda não possuem nenhuma senha hoje (pendente, chamada ou paga)
  const motoboysFilaPagamento = motoboysAptos.filter((motoboy) => {
    return !senhas.some(
      (senha) => senha.entregador_id && senha.entregador_id === motoboy.id,
    );
  });

  if (!selectedUnit) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">
          Selecione uma unidade para continuar
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <BackButton />

      <div className="mb-6">
        <h1 className="text-3xl font-bold font-mono mb-2 flex items-center gap-3">
          <Ticket className="w-8 h-8 text-amber-500" />
          Fila de Pagamento
        </h1>
        <p className="text-muted-foreground">
          Gestão de senhas para pagamento •{' '}
          <span className="font-semibold text-foreground">{selectedUnit}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-muted-foreground">
              Motoboys aptos a receber hoje
            </span>
          </div>
          <p className="text-3xl font-bold font-mono">{motoboysAptos.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">Senhas pendentes</span>
          </div>
          <p className="text-3xl font-bold font-mono">{senhasPendentes.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-muted-foreground">Pagos hoje</span>
          </div>
          <p className="text-3xl font-bold font-mono">{senhasPagas.length}</p>
        </div>
      </div>

      {/* Motoboys que aparecem na fila (disponivel) */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-amber-500" />
          Motoboys na fila de pagamento
        </h2>
        {motoboysFilaPagamento.length === 0 ? (
          <div className="text-center py-10 bg-card border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Nenhum motoboy apto a receber no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {motoboysFilaPagamento.map((motoboy) => (
              <div
                key={motoboy.id}
                className="bg-card border rounded-lg p-4 flex flex-col gap-2"
              >
                <div>
                  <p className="font-semibold text-lg leading-tight">{motoboy.nome}</p>
                  <p className="text-xs text-muted-foreground break-all">
                    {motoboy.telefone}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="mt-2 gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={async () => {
                    try {
                      // Resolver unidade e franquia com base na loja selecionada
                      let unidadeId = user?.unidadeId as string | undefined;
                      let franquiaId: string | null = null;

                      if (unidadeId) {
                        const { data: unidadeRow, error } = await supabase
                          .from('unidades')
                          .select('id, franquia_id')
                          .eq('id', unidadeId)
                          .maybeSingle();

                        if (error || !unidadeRow || !unidadeRow.franquia_id) {
                          toast.error('Configuração da unidade não encontrada');
                          return;
                        }

                        unidadeId = unidadeRow.id as string;
                        franquiaId = unidadeRow.franquia_id as string;
                      } else {
                        const { data: unidadeRow, error } = await supabase
                          .from('unidades')
                          .select('id, franquia_id')
                          .ilike('nome_loja', `%${selectedUnit as string}%`)
                          .maybeSingle();

                        if (error || !unidadeRow || !unidadeRow.franquia_id) {
                          toast.error('Configuração da unidade não encontrada');
                          return;
                        }

                        unidadeId = unidadeRow.id as string;
                        franquiaId = unidadeRow.franquia_id as string;
                      }

                      await gerarSenhaPagamento(
                        unidadeId,
                        franquiaId!,
                        motoboy.id,
                        motoboy.nome,
                      );

                      await queryClient.invalidateQueries({
                        queryKey: ['senhas-pagamento'],
                      });

                      toast.success('Senha gerada para pagamento');
                    } catch (error) {
                      console.error('Erro ao gerar senha para pagamento:', error);
                      toast.error('Erro ao gerar senha para pagamento');
                    }
                  }}
                >
                  <Ticket className="w-4 h-4" />
                  Gerar senha para pagamento
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Ações em massa */}
          {motoboysFilaPagamento.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <p className="text-sm text-muted-foreground">
                {motoboysFilaPagamento.length} motoboy(s) na fila sem senha gerada.
              </p>
              <Button
                variant="outline"
                className="w-full sm:w-auto gap-2"
                onClick={async () => {
                  try {
                    // Resolver unidade e franquia uma única vez
                    let unidadeId = user?.unidadeId as string | undefined;
                    let franquiaId: string | null = null;

                    if (unidadeId) {
                      const { data: unidadeRow, error } = await supabase
                        .from('unidades')
                        .select('id, franquia_id')
                        .eq('id', unidadeId)
                        .maybeSingle();

                      if (error || !unidadeRow || !unidadeRow.franquia_id) {
                        toast.error('Configuração da unidade não encontrada');
                        return;
                      }

                      unidadeId = unidadeRow.id as string;
                      franquiaId = unidadeRow.franquia_id as string;
                    } else {
                      const { data: unidadeRow, error } = await supabase
                        .from('unidades')
                        .select('id, franquia_id')
                        .ilike('nome_loja', `%${selectedUnit as string}%`)
                        .maybeSingle();

                      if (error || !unidadeRow || !unidadeRow.franquia_id) {
                        toast.error('Configuração da unidade não encontrada');
                        return;
                      }

                      unidadeId = unidadeRow.id as string;
                      franquiaId = unidadeRow.franquia_id as string;
                    }

                    // Gerar senhas em sequência com delay aleatório entre 3 e 5 segundos
                    for (const motoboy of motoboysFilaPagamento) {
                      await gerarSenhaPagamento(
                        unidadeId,
                        franquiaId!,
                        motoboy.id,
                        motoboy.nome,
                      );

                      const delayMs = 3000 + Math.random() * 2000; // 3 a 5 segundos
                      await new Promise((resolve) => setTimeout(resolve, delayMs));
                    }

                    await queryClient.invalidateQueries({
                      queryKey: ['senhas-pagamento'],
                    });

                    toast.success('Senhas geradas para todos os motoboys na fila');
                  } catch (error) {
                    console.error('Erro ao gerar senhas em massa:', error);
                    toast.error('Erro ao gerar senhas em massa');
                  }
                }}
              >
                <Ticket className="w-4 h-4" />
                Gerar senha para todos
              </Button>
            </div>
          )}

          {/* Senhas Pendentes */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-500" />
              Pendentes ({senhasPendentes.length})
            </h2>
            {senhasPendentes.length === 0 ? (
              <div className="text-center py-12 bg-card border border-dashed border-border rounded-lg">
                <Ticket className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma senha pendente</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {senhasPendentes.map((senha) => (
                  <div
                    key={senha.id}
                    className="bg-card border-2 border-amber-500 rounded-lg p-6"
                  >
                    <div className="text-center mb-4">
                      <p className="text-5xl font-bold font-mono text-amber-500">
                        {senha.numero_senha}
                      </p>
                      {senha.entregador_nome && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {senha.entregador_nome}
                        </p>
                      )}
                    </div>
                    <Button
                       onClick={() => {
                         if (senha.status === 'aguardando') {
                           chamarMutation.mutate(senha.id);
                         } else {
                           atenderMutation.mutate(senha.id);
                         }
                       }}
                       disabled={atenderMutation.isPending || chamarMutation.isPending}
                       variant="outline"
                       className="w-full gap-2 border-green-500 hover:bg-green-500 hover:text-white"
                     >
                       <Check className="w-4 h-4" />
                       {senha.status === 'aguardando' ? 'Chamar para receber' : 'Marcar como pago'}
                     </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Senhas Pagas (histórico) */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Check className="w-5 h-5 text-blue-500" />
              Pagos ({senhasPagas.length})
            </h2>
            {senhasPagas.length === 0 ? (
              <div className="text-center py-12 bg-card border border-dashed border-border rounded-lg">
                <Check className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum pagamento concluído hoje</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {senhasPagas.map((senha) => (
                  <div
                    key={senha.id}
                    className="bg-card border border-border rounded-lg p-6 opacity-70"
                  >
                    <div className="text-center">
                      <p className="text-4xl font-bold font-mono text-blue-500">
                        {senha.numero_senha}
                      </p>
                      {senha.entregador_nome && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {senha.entregador_nome}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Pago {senha.atendido_em ? new Date(senha.atendido_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
