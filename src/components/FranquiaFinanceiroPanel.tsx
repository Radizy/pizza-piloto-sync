import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInCalendarDays, format } from 'date-fns';
import { toast } from 'sonner';

interface FranquiaFinanceiro {
  id: string;
  nome_franquia: string;
  status_pagamento: string | null;
  data_vencimento: string | null;
  config_pagamento: any | null;
}

interface PlanoResumo {
  id: string;
  nome: string;
  tipo: string;
  valor_base: number;
  duracao_meses: number;
}

export function FranquiaFinanceiroPanel() {
  const { user } = useAuth();
  const [isPaying, setIsPaying] = useState(false);

  const { data: franquia, isLoading: isLoadingFranquia } = useQuery<FranquiaFinanceiro | null>({
    queryKey: ['franquia-financeiro', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return null;

      const { data, error } = await supabase
        .from('franquias')
        .select('id, nome_franquia, status_pagamento, data_vencimento, config_pagamento')
        .eq('id', user.franquiaId)
        .maybeSingle();

      if (error) throw error;
      return data as FranquiaFinanceiro | null;
    },
    enabled: !!user?.franquiaId,
  });

  const planoId = (franquia?.config_pagamento as any)?.plano_id as string | undefined;

  const { data: planoAtual, isLoading: isLoadingPlano } = useQuery<PlanoResumo | null>({
    queryKey: ['plano-atual', planoId],
    queryFn: async () => {
      if (!planoId) return null;

      const { data, error } = await supabase
        .from('planos')
        .select('id, nome, tipo, valor_base, duracao_meses')
        .eq('id', planoId)
        .maybeSingle();

      if (error) throw error;
      return data as PlanoResumo | null;
    },
    enabled: !!planoId,
  });

  const diasRestantes = useMemo(() => {
    if (!franquia?.data_vencimento) return null;
    return differenceInCalendarDays(new Date(franquia.data_vencimento), new Date());
  }, [franquia?.data_vencimento]);

  const valorPlano = useMemo(() => {
    const cfg = (franquia?.config_pagamento as any) || {};
    if (cfg.valor_plano != null) return Number(cfg.valor_plano);
    if (planoAtual?.valor_base != null) return Number(planoAtual.valor_base);
    return null;
  }, [franquia?.config_pagamento, planoAtual?.valor_base]);

  const handlePagarPix = async () => {
    if (!franquia || !valorPlano) {
      toast.error('Não foi possível identificar o valor da franquia.');
      return;
    }

    try {
      setIsPaying(true);

      const { data, error } = await supabase.functions.invoke('criar-cobranca-franquia', {
        body: { franquiaId: franquia.id },
      });

      if (error) {
        console.error('Erro ao criar cobrança:', error);
        toast.error('Erro ao criar cobrança. Tente novamente.');
        return;
      }

      const checkoutUrl = (data as any)?.checkoutUrl as string | undefined;

      if (!checkoutUrl) {
        toast.error('Cobrança criada, mas o gateway não retornou um link de pagamento.');
        return;
      }

      window.open(checkoutUrl, '_blank');
    } catch (err) {
      console.error('Erro inesperado ao criar cobrança:', err);
      toast.error('Erro inesperado ao gerar a cobrança.');
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoadingFranquia) {
    return (
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono">Plano atual</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono">Status da conta</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!franquia) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm font-mono">Financeiro da franquia</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar os dados da franquia. Verifique se o usuário está associado
            corretamente a uma franquia.
          </p>
        </CardContent>
      </Card>
    );
  }

  const status = franquia.status_pagamento ?? 'indefinido';
  const vencimentoFormatado = franquia.data_vencimento
    ? format(new Date(franquia.data_vencimento), 'dd/MM/yyyy')
    : null;

  const statusLabel = status === 'ativo' ? 'Ativo' : status === 'inadimplente' ? 'Inadimplente' : 'Indefinido';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono">Plano atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Franquia</p>
                <p className="font-mono font-semibold text-base">{franquia.nome_franquia}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Valor do plano</p>
                <p className="font-mono text-2xl font-bold">
                  {valorPlano != null ? `R$ ${valorPlano.toFixed(2)}` : '—'}
                </p>
                {planoAtual && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {planoAtual.nome} • {planoAtual.tipo} • {planoAtual.duracao_meses} mês(es)
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Status de pagamento</p>
                <p className="font-mono text-sm">
                  {statusLabel}
                </p>
              </div>
              <div className="space-y-1 text-right md:text-left">
                <p className="text-xs text-muted-foreground">Próximo vencimento</p>
                <p className="font-mono text-sm">{vencimentoFormatado ?? '—'}</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border/60 bg-muted/5 p-3">
              <p className="text-xs text-muted-foreground">
                Dúvidas sobre cobrança ou troca de plano? Entre em contato com o suporte financeiro
                pelo WhatsApp e informe o nome da sua franquia.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono">Status da conta</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Situação</p>
                <p className="font-mono font-semibold capitalize">{statusLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Dias para o vencimento</p>
                <p className="font-mono text-3xl font-bold">
                  {diasRestantes != null ? diasRestantes : '—'}
                </p>
              </div>
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={handlePagarPix}
              disabled={!valorPlano || isPaying}
            >
              {isPaying ? 'Gerando cobrança…' : 'PAGAR COM PIX'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
