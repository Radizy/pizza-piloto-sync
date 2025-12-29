import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SenhaPagamento, Entregador } from '@/lib/api';

interface TvPreviewProps {
  franquiaId?: string | null;
  unidadeNome?: string | null;
  unidadeId?: string | null;
  unidadeSlug?: string | null;
}

const defaultTvPrompts = {
  entrega_chamada: 'É a sua vez {nome}',
  entrega_bag: 'Pegue a {bag}',
  pagamento_chamada:
    'Senha {senha}\n{nome}, é a sua vez de receber!\nVá até o caixa imediatamente.',
};

export function TvPaymentPreview({
  franquiaId,
  unidadeNome,
  unidadeId,
  unidadeSlug,
}: TvPreviewProps) {
  // Sem franquia, não há configuração de TV – não renderiza
  if (!franquiaId) return null;

  // Config de prompts de TV da franquia
  const { data: franquiaConfig } = useQuery<{ config_pagamento: any | null }>({
    queryKey: ['franquia-config-tv', franquiaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franquias')
        .select('config_pagamento')
        .eq('id', franquiaId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || { config_pagamento: null };
    },
    enabled: !!franquiaId,
  });

  const tvPrompts = (franquiaConfig?.config_pagamento as any)?.tv_prompts || defaultTvPrompts;

  // Tipos de BAG da franquia para montar texto igual na TV
  const { data: franquiaBagTipos = [] } = useQuery<
    { id: string; nome: string; descricao: string | null; ativo: boolean; franquia_id: string }[]
  >({
    queryKey: ['franquia-bag-tipos', franquiaId],
    queryFn: async () => {
      if (!franquiaId) return [];
      const { data, error } = await supabase
        .from('franquia_bag_tipos')
        .select('id, nome, descricao, ativo, franquia_id')
        .eq('franquia_id', franquiaId)
        .eq('ativo', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!franquiaId,
  });

  const buildTvTexts = (nome: string, bagName?: string, senha?: string) => {
    const chamadaTemplate = tvPrompts.entrega_chamada || defaultTvPrompts.entrega_chamada;
    const bagTemplate = tvPrompts.entrega_bag || defaultTvPrompts.entrega_bag;
    const pagamentoTemplate = tvPrompts.pagamento_chamada || defaultTvPrompts.pagamento_chamada;

    const chamadaText = chamadaTemplate.replace('{nome}', nome);
    const bagText = bagTemplate.replace('{bag}', bagName || 'sua bag');
    const pagamentoText = pagamentoTemplate
      .replace('{nome}', nome)
      .replace('{senha}', senha || '')
      .replace('{unidade}', unidadeNome || unidadeSlug || 'sua loja');

    return { chamadaText, bagText, pagamentoText };
  };

  const [displayingPagamento, setDisplayingPagamento] = useState<SenhaPagamento | null>(null);
  const [displayingEntregador, setDisplayingEntregador] = useState<Entregador | null>(null);

  const pagamentoTimerRef = useRef<number | null>(null);
  const entregaTimerRef = useRef<number | null>(null);

  // Reagir em tempo real às chamadas de pagamento (mesma fonte da TV)
  useEffect(() => {
    if (!unidadeId) return;

    const channel = supabase
      .channel('tv-pagamentos-preview')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'senhas_pagamento',
          filter: `unidade_id=eq.${unidadeId}`,
        },
        (payload) => {
          const novaSenha = payload.new as SenhaPagamento;
          if (novaSenha.status === 'chamado') {
            setDisplayingPagamento(novaSenha);
            setDisplayingEntregador(null); // pagamento tem prioridade

            if (pagamentoTimerRef.current) window.clearTimeout(pagamentoTimerRef.current);
            pagamentoTimerRef.current = window.setTimeout(() => {
              setDisplayingPagamento(null);
            }, 5000);
          }
        },
      )
      .subscribe();

    return () => {
      if (pagamentoTimerRef.current) window.clearTimeout(pagamentoTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [unidadeId]);

  // Reagir em tempo real às chamadas de ENTREGA
  useEffect(() => {
    if (!unidadeNome) return;

    const channel = supabase
      .channel('tv-calls-preview')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'entregadores',
          filter: `unidade=eq.${unidadeNome}`,
        },
        (payload) => {
          const novo = payload.new as Entregador;
          if (novo.status === 'chamado') {
            // Só mostra entrega se não houver pagamento em destaque
            if (!displayingPagamento) {
              setDisplayingEntregador(novo);

              if (entregaTimerRef.current) window.clearTimeout(entregaTimerRef.current);
              entregaTimerRef.current = window.setTimeout(() => {
                setDisplayingEntregador(null);
              }, 5000);
            }
          }
        },
      )
      .subscribe();

    return () => {
      if (entregaTimerRef.current) window.clearTimeout(entregaTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [unidadeNome, displayingPagamento]);

  const isPagamento = !!displayingPagamento;
  const isEntrega = !!displayingEntregador && !displayingPagamento;
  const isAguardando = !isPagamento && !isEntrega;

  const previewTexts = useMemo(() => {
    if (isPagamento && displayingPagamento) {
      const nome = displayingPagamento.entregador_nome || 'Motoboy';
      const senha = displayingPagamento.numero_senha || 'P001';
      const { pagamentoText } = buildTvTexts(nome, undefined, senha);
      return { lines: pagamentoText.split('\n'), variant: 'pagamento' as const };
    }

    if (isEntrega && displayingEntregador) {
      const bagId = displayingEntregador.tipo_bag;
      const bagName = bagId
        ? franquiaBagTipos.find((b) => b.id === bagId)?.nome || bagId
        : '';
      const { chamadaText, bagText } = buildTvTexts(displayingEntregador.nome, bagName);
      const lines = [chamadaText, bagText];
      return { lines, variant: 'entrega' as const };
    }

    return { lines: [] as string[], variant: 'none' as const };
  }, [
    isPagamento,
    isEntrega,
    displayingPagamento,
    displayingEntregador,
    franquiaBagTipos,
  ]);

  const gradientClass =
    previewTexts.variant === 'pagamento'
      ? 'from-emerald-900/70 via-emerald-800/70 to-emerald-950/80'
      : 'from-sky-900/70 via-sky-800/70 to-sky-950/80';

  return (
    <div className="bg-card border border-border rounded-lg p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-muted-foreground">
          Prévia da TV (ao vivo)
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground uppercase tracking-wide">
          {isPagamento ? 'Pagamento' : isEntrega ? 'Entrega' : 'Aguardando'}
        </span>
      </div>

      {isAguardando ? (
        <div className="mt-3 rounded-md border border-dashed border-border px-3 py-6 text-xs sm:text-sm text-muted-foreground text-center">
          Nenhuma chamada ativa na TV no momento.
        </div>
      ) : (
        <div
          className={
            'mt-2 rounded-md bg-gradient-to-br px-3 py-2 text-xs sm:text-sm text-emerald-50 font-mono leading-snug ' +
            gradientClass
          }
        >
          {previewTexts.lines.map((line, idx) => (
            <p
              key={idx}
              className={
                idx === 0
                  ? 'text-[0.65rem] sm:text-[0.7rem] tracking-[0.18em] uppercase'
                  : 'text-[0.7rem] sm:text-xs opacity-90'
              }
            >
              {line}
            </p>
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-primary/10" />
    </div>
  );
}
