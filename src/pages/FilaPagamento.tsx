import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Layout, BackButton } from '@/components/Layout';
import {
  gerarSenhaPagamento,
  fetchSenhasPagamento,
  chamarSenhaPagamento,
  atenderSenhaPagamento,
  SenhaPagamento,
  fetchEntregadores,
  shouldShowInQueue,
  Entregador,
  Unidade,
} from '@/lib/api';
import { toast } from 'sonner';
import { Ticket, Phone, Check, Loader2 } from 'lucide-react';
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

  const motoboysAptos = entregadores.filter(
    (e) =>
      e.ativo &&
      e.status === 'disponivel' &&
      shouldShowInQueue(e),
  );

  // Buscar senhas ativas
  const { data: senhas = [], isLoading } = useQuery({
    queryKey: ['senhas-pagamento', user?.unidadeId],
    queryFn: () => fetchSenhasPagamento(user!.unidadeId!),
    enabled: !!user?.unidadeId,
    refetchInterval: 5000,
  });

  // Enviar WhatsApp ao chamar pagamento usando template da unidade
  const sendPagamentoWhatsapp = async (senha: SenhaPagamento) => {
    if (!user?.unidadeId || !user?.franquiaId || !senha.entregador_id) return;

    const { data: template } = await supabase
      .from('whatsapp_templates')
      .select('mensagem')
      .eq('unidade_id', user.unidadeId)
      .eq('codigo', 'chamada_pagamento')
      .maybeSingle();

    if (!template?.mensagem) return;

    const { data: entregador } = await supabase
      .from('entregadores')
      .select('nome, telefone')
      .eq('id', senha.entregador_id)
      .maybeSingle();

    if (!entregador?.telefone) return;

    const nome = senha.entregador_nome || entregador.nome;
    let mensagem = template.mensagem as string;
    mensagem = mensagem.replace(/{{\s*nome\s*}}/gi, nome);
    mensagem = mensagem.replace(/{{\s*senha\s*}}/gi, senha.numero_senha);

    const { sendWhatsAppMessage } = await import('@/lib/api');
    await sendWhatsAppMessage(entregador.telefone, mensagem, {
      franquiaId: user.franquiaId,
      unidadeId: user.unidadeId,
    });
  };

  // Mutation para chamar senha (atualiza status + WhatsApp + dispara animação TV)
  const chamarMutation = useMutation({
    mutationFn: async (senha: SenhaPagamento) => {
      await chamarSenhaPagamento(senha.id);
      await sendPagamentoWhatsapp(senha);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['senhas-pagamento'] });
      toast.success('Senha chamada e TV notificada!');
    },
    onError: () => {
      toast.error('Erro ao chamar senha');
    },
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

  const senhasChamadas = senhas.filter((s) => s.status === 'chamado');
  const senhasPagas = senhas.filter((s) => s.status === 'atendido');

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
      <div className="grid grid-cols-2 gap-4 mb-8">
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
            <span className="text-sm text-muted-foreground">Senhas chamadas</span>
          </div>
          <p className="text-3xl font-bold font-mono">{senhasChamadas.length}</p>
        </div>
      </div>

      {/* Motoboys que aparecem na fila (disponivel) */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-amber-500" />
          Motoboys na fila de pagamento
        </h2>
        {motoboysAptos.length === 0 ? (
          <div className="text-center py-10 bg-card border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Nenhum motoboy apto a receber no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {motoboysAptos.map((motoboy) => (
              <div
                key={motoboy.id}
                className="bg-card border rounded-lg p-4 flex flex-col gap-2"
              >
                <div>
                  <p className="font-semibold text-lg">{motoboy.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {motoboy.telefone}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="mt-2 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={chamarMutation.isPending}
                  onClick={async () => {
                    if (!user?.unidadeId || !user?.franquiaId) {
                      toast.error('Informações de unidade não encontradas');
                      return;
                    }
                    try {
                      const senhaCriada = await gerarSenhaPagamento(
                        user.unidadeId,
                        user.franquiaId,
                        motoboy.id,
                        motoboy.nome,
                      );

                      await queryClient.invalidateQueries({
                        queryKey: ['senhas-pagamento'],
                      });

                      const senhaParaChamar: SenhaPagamento | undefined = Array.isArray(
                        senhaCriada,
                      )
                        ? (senhaCriada[0] as any)
                        : (senhaCriada as any);

                      if (senhaParaChamar) {
                        chamarMutation.mutate(senhaParaChamar);
                      }
                    } catch {
                      toast.error('Erro ao gerar/chamar senha para este motoboy');
                    }
                  }}
                >
                  <Phone className="w-4 h-4" />
                  Chamar para pagamento
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
          {/* Senhas Chamadas */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-500" />
              Chamadas ({senhasChamadas.length})
            </h2>
            {senhasChamadas.length === 0 ? (
              <div className="text-center py-12 bg-card border border-dashed border-border rounded-lg">
                <Phone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma senha chamada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {senhasChamadas.map((senha) => (
                  <div
                    key={senha.id}
                    className="bg-card border-2 border-green-500 rounded-lg p-6 animate-pulse"
                  >
                    <div className="text-center mb-4">
                      <p className="text-5xl font-bold font-mono text-green-500">
                        {senha.numero_senha}
                      </p>
                      {senha.entregador_nome && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {senha.entregador_nome}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => atenderMutation.mutate(senha.id)}
                      disabled={atenderMutation.isPending}
                      variant="outline"
                      className="w-full gap-2 border-green-500 hover:bg-green-500 hover:text-white"
                    >
                      <Check className="w-4 h-4" />
                      Marcar como pago
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
