import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TvPaymentPreviewProps {
  franquiaId?: string | null;
  unidadeNome?: string | null;
}

const defaultTvPrompts = {
  entrega_chamada: 'É a sua vez {nome}',
  entrega_bag: 'Pegue a {bag}',
  pagamento_chamada:
    'Senha {senha}\n{nome}, é a sua vez de receber!\nVá até o caixa imediatamente.',
};

export function TvPaymentPreview({ franquiaId, unidadeNome }: TvPaymentPreviewProps) {
  // Se não houver franquia, não há configuração de TV – não renderiza nada
  if (!franquiaId) return null;

  const { data } = useQuery<{ config_pagamento: any | null }>({
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

  const tvPrompts = (data?.config_pagamento as any)?.tv_prompts || defaultTvPrompts;

  const previewText: string = useMemo(() => {
    const pagamentoTemplate = tvPrompts.pagamento_chamada || defaultTvPrompts.pagamento_chamada;

    return pagamentoTemplate
      .replace('{nome}', 'Motoboy Exemplo')
      .replace('{senha}', 'P001')
      .replace('{unidade}', unidadeNome || 'sua loja');
  }, [tvPrompts, unidadeNome]);

  const lines = previewText.split('\n');

  return (
    <div className="bg-card border border-border rounded-lg p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-muted-foreground">Prévia na TV</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground uppercase tracking-wide">
          Pagamento
        </span>
      </div>

      <div className="mt-2 rounded-md bg-gradient-to-br from-emerald-900/70 via-emerald-800/70 to-emerald-950/80 px-3 py-2 text-xs sm:text-sm text-emerald-100 font-mono leading-snug">
        {lines.map((line, idx) => (
          <p key={idx} className={idx === 0 ? 'text-[0.65rem] sm:text-[0.7rem] tracking-[0.2em]' : idx === 1 ? 'text-sm sm:text-base font-bold' : 'text-[0.7rem] sm:text-xs text-emerald-200'}>
            {line}
          </p>
        ))}
      </div>

      <div className="pointer-events-none absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-emerald-500/20" />
    </div>
  );
}
