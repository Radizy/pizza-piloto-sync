import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  fetchEntregadores, 
  fetchHistoricoEntregas,
  fetchSystemConfig,
  fetchGlobalConfig,
  updateEntregador, 
  shouldShowInQueue,
  Entregador,
  HORARIO_EXPEDIENTE,
  sendWhatsAppMessage,
  SenhaPagamento,
  fetchSenhasPagamento,
} from '@/lib/api';
import { Pizza, User, Volume2, VolumeX, RotateCcw, Package, UserPlus, Trophy, Wine } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTTS } from '@/hooks/useTTS';
import { CheckinModal } from '@/components/CheckinModal';
import { TVCallAnimation } from '@/components/TVCallAnimation';
import { supabase } from '@/integrations/supabase/client';

const CALL_AUDIO_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const DISPLAY_TIME_MS = 15000; // 15 segundos na tela

interface CalledEntregadorInfo {
  entregador: Entregador;
  hasBebida: boolean;
}

export default function TV() {
  const { selectedUnit, setSelectedUnit } = useUnit();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [displayingCalled, setDisplayingCalled] = useState<CalledEntregadorInfo | null>(null);
  const [displayingPagamento, setDisplayingPagamento] = useState<SenhaPagamento | null>(null);
  const [showDeliveries, setShowDeliveries] = useState(false); // Oscila entre saídas e entregas
  const { speak } = useTTS();
  const lastCacheClean = useRef<number>(Date.now());
  const lastCallTime = useRef<number>(0);
  const processedCallsRef = useRef<Set<string>>(new Set());
  const lastPagamentoIdRef = useRef<string | null>(null);

  // Apenas usuários autenticados com unidade podem acessar (rota já é protegida,
  // mas aqui garantimos a unidade correta)
  if (!user || !user.unidade) {
    return <Navigate to="/" replace />;
  }

  if (!selectedUnit || selectedUnit !== user.unidade) {
    setSelectedUnit(user.unidade as any);
  }

  // Redirect if no unit selected
  if (!selectedUnit) {
    return <Navigate to="/" replace />;
  }

  // Query for system config (nome da loja)
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config', selectedUnit],
    queryFn: () => fetchSystemConfig(selectedUnit),
  });

  // Query for global config (nome do sistema)
  const { data: systemName } = useQuery({
    queryKey: ['global-config', 'system_name'],
    queryFn: () => fetchGlobalConfig('system_name'),
  });

  const displayName = systemConfig?.nome_loja || systemName || 'DeliveryOS';

  // Query for fetching entregadores - atualiza a cada 10 segundos
  const { data: entregadores = [], refetch } = useQuery({
    queryKey: ['entregadores', selectedUnit, 'tv'],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit }),
    refetchInterval: 10000, // 10 segundos
  });

  // Calcular período do expediente atual para o rank
  const getExpedientePeriod = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    let dataInicio: Date;
    let dataFim: Date;

    if (currentHour < 3) {
      // Antes das 03:00 - expediente de ontem
      dataInicio = new Date(now);
      dataInicio.setDate(dataInicio.getDate() - 1);
      dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);
      
      dataFim = new Date(now);
      dataFim.setHours(3, 0, 0, 0);
    } else if (currentHour >= HORARIO_EXPEDIENTE.inicio) {
      // Após 17:00 - expediente de hoje
      dataInicio = new Date(now);
      dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);
      
      dataFim = new Date(now);
      dataFim.setDate(dataFim.getDate() + 1);
      dataFim.setHours(3, 0, 0, 0);
    } else {
      // Entre 03:00 e 17:00 - não há expediente ativo
      dataInicio = new Date(now);
      dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);
      
      dataFim = new Date(now);
      dataFim.setDate(dataFim.getDate() + 1);
      dataFim.setHours(3, 0, 0, 0);
    }

    return { dataInicio, dataFim };
  };

  const { dataInicio, dataFim } = getExpedientePeriod();

  // Query para histórico do ranking
  const { data: historico = [], refetch: refetchHistorico } = useQuery({
    queryKey: ['historico-rank', selectedUnit, dataInicio.toISOString()],
    queryFn: () =>
      fetchHistoricoEntregas({
        unidade: selectedUnit,
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim.toISOString(),
      }),
    refetchInterval: 10000, // Atualiza a cada 10 segundos
  });

  // Query para senhas de pagamento (para mostrar chamado na TV)
  const { data: senhasPagamento = [] } = useQuery({
    queryKey: ['senhas-pagamento-tv', user.unidadeId],
    queryFn: () => fetchSenhasPagamento(user.unidadeId!),
    enabled: !!user.unidadeId,
    refetchInterval: 5000,
  });

  // Calcular top 3 por saídas e entregas (com desempate por quem chegou primeiro)
  const top3 = useMemo(() => {
    type RankItem = {
      id: string;
      nome: string;
      saidas: number;
      entregas: number; // entregas = saídas com hora_retorno preenchida
      firstAt: Date | null;
    };

    const mapa: Record<string, RankItem> = {};

    // Inicializa com todos entregadores ativos da unidade, com 0 saídas/entregas
    entregadores.forEach((e) => {
      if (!e.ativo) return;
      mapa[e.id] = {
        id: e.id,
        nome: e.nome,
        saidas: 0,
        entregas: 0,
        firstAt: null,
      };
    });

    // Conta saídas e entregas do período
    historico.forEach((h) => {
      const item = mapa[h.entregador_id];
      if (!item) return;

      item.saidas += 1;
      // Considera entrega feita se tem hora_retorno
      if (h.hora_retorno) {
        item.entregas += 1;
      }
      const createdAt = new Date(h.created_at);
      if (!item.firstAt || createdAt < item.firstAt) {
        item.firstAt = createdAt;
      }
    });

    const lista = Object.values(mapa);

    if (lista.length === 0) return [];

    const maxSaidas = Math.max(...lista.map((i) => i.saidas));

    // Se todo mundo estiver zerado, mostrar em ordem aleatória
    if (maxSaidas === 0) {
      const shuffled = [...lista].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 3).map(({ nome, saidas, entregas }) => ({ nome, saidas, entregas }));
    }

    // Caso normal: ordena por mais saídas e, em caso de empate,
    // quem chegou primeiro nesse número (menor firstAt) vem na frente
    return lista
      .sort((a, b) => {
        if (b.saidas !== a.saidas) return b.saidas - a.saidas;
        if (a.firstAt && b.firstAt) return a.firstAt.getTime() - b.firstAt.getTime();
        if (a.firstAt) return -1;
        if (b.firstAt) return 1;
        return a.nome.localeCompare(b.nome);
      })
      .slice(0, 3)
      .map(({ nome, saidas, entregas }) => ({ nome, saidas, entregas }));
  }, [historico, entregadores]);

  // Mutation for updating status
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Entregador> }) =>
      updateEntregador(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
    },
  });

  // Verifica se tem check-in recente (nas últimas 24 horas)
  const hasRecentCheckin = (entregador: Entregador) => {
    if (!entregador.fila_posicao) return false;
    const now = new Date().getTime();
    const filaTime = new Date(entregador.fila_posicao).getTime();
    const diffHours = (now - filaTime) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  // Filter entregadores (with shift/workday check for available, mas liberando quem fez check-in recente)
  const activeEntregadores = entregadores.filter(e => e.ativo);
  const availableQueue = activeEntregadores
    .filter((e) => e.status === 'disponivel' && (shouldShowInQueue(e) || hasRecentCheckin(e)));
  const calledEntregadores = activeEntregadores.filter((e) => e.status === 'chamado');
  const deliveringQueue = activeEntregadores.filter((e) => e.status === 'entregando');

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Oscilar entre saídas e entregas a cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setShowDeliveries(prev => !prev);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Limpeza de cache a cada 1 hora (sem apagar a fila)
  useEffect(() => {
    const checkCacheClean = () => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      if (now - lastCacheClean.current >= oneHour) {
        queryClient.invalidateQueries({ 
          queryKey: ['entregadores'],
          refetchType: 'active'
        });
        lastCacheClean.current = now;
        console.log('Cache limpo às', new Date().toLocaleTimeString());
      }
    };

    const interval = setInterval(checkCacheClean, 60000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // Tipos de BAG configurados para a franquia do usuário (para exibir nome correto na TV)
  const { data: franquiaBagTipos = [] } = useQuery<{
    id: string;
    nome: string;
    descricao: string | null;
    ativo: boolean;
    franquia_id: string;
  }[]>({
    queryKey: ['franquia-bag-tipos', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return [];
      const { data, error } = await supabase
        .from('franquia_bag_tipos')
        .select('id, nome, descricao, ativo, franquia_id')
        .eq('franquia_id', user.franquiaId)
        .eq('ativo', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.franquiaId,
  });

  // Configurações de prompts da TV (por franquia)
  const { data: franquiaConfig } = useQuery<{ config_pagamento: any | null }>({
    queryKey: ['franquia-config-tv', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return { config_pagamento: null };
      const { data, error } = await supabase
        .from('franquias')
        .select('config_pagamento')
        .eq('id', user.franquiaId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || { config_pagamento: null };
    },
    enabled: !!user?.franquiaId,
  });

  const defaultTvPrompts = {
    entrega_chamada: 'É a sua vez {nome}',
    entrega_bag: 'Pegue a {bag}',
    pagamento_chamada: 'Senha {senha}\n{nome}, é a sua vez de receber!\nVá até o caixa imediatamente.',
  };

  const tvPrompts = (franquiaConfig?.config_pagamento as any)?.tv_prompts || defaultTvPrompts;

  const buildTvTexts = (nome: string, bagName?: string, senha?: string) => {
    const chamadaTemplate = tvPrompts.entrega_chamada || defaultTvPrompts.entrega_chamada;
    const bagTemplate = tvPrompts.entrega_bag || defaultTvPrompts.entrega_bag;
    const pagamentoTemplate = tvPrompts.pagamento_chamada || defaultTvPrompts.pagamento_chamada;

    const chamadaText = chamadaTemplate.replace('{nome}', nome);
    const bagText = bagTemplate.replace('{bag}', bagName || 'sua bag');
    const pagamentoText = pagamentoTemplate
      .replace('{nome}', nome)
      .replace('{senha}', senha || '')
      .replace('{unidade}', systemConfig?.nome_loja || systemName || 'sua loja');

    return { chamadaText, bagText, pagamentoText };
  };

  // Play audio and TTS quando alguém é chamado
  const handleCallAnnouncement = useCallback(async (entregador: Entregador, hasBebida: boolean) => {
    if (isMuted) return;

    // Play sound first
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      await audioRef.current.play().catch(() => {});
    }

    // Resolver nome amigável da BAG a partir do ID salvo no entregador
    const bagId = entregador.tipo_bag;
    const bagName = bagId
      ? franquiaBagTipos.find((b) => b.id === bagId)?.nome || bagId
      : '';

    const { chamadaText, bagText } = buildTvTexts(entregador.nome, bagName || undefined);

    let ttsText = `${chamadaText}. ${bagText}.`;
    
    if (hasBebida) {
      ttsText += ' Atenção! O pedido possui refrigerante!';
    }
    
    await speak(ttsText);
  }, [isMuted, speak, franquiaBagTipos, tvPrompts]);


  // Listen for realtime calls with bebida info (entregas)
  useEffect(() => {
    const channel = supabase
      .channel('tv-calls')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'entregadores',
          filter: `unidade=eq.${selectedUnit}`,
        },
        (payload) => {
          const newData = payload.new as Entregador & { has_bebida?: boolean };
          if (newData.status === 'chamado' && !processedCallsRef.current.has(newData.id)) {
            // Store bebida info temporarily
            const hasBebida = (newData as any).has_bebida || false;
            processedCallsRef.current.add(newData.id);
            
            const now = Date.now();
            const timeSinceLastCall = now - lastCallTime.current;
            const delay = Math.max(0, 5000 - timeSinceLastCall);
            
            setTimeout(() => {
              lastCallTime.current = Date.now();
              setDisplayingCalled({ entregador: newData, hasBebida });
              handleCallAnnouncement(newData, hasBebida);
              
              setTimeout(() => {
                updateMutation.mutate({
                  id: newData.id,
                  data: { 
                    status: 'entregando',
                    hora_saida: new Date().toISOString(),
                  },
                });
                setDisplayingCalled(null);
              }, DISPLAY_TIME_MS);
            }, delay);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUnit, handleCallAnnouncement, updateMutation]);

  // Processar chamados existentes (fallback)
  useEffect(() => {
    const MIN_DELAY_MS = 5000;
    
    calledEntregadores.forEach((entregador) => {
      if (!processedCallsRef.current.has(entregador.id)) {
        const now = Date.now();
        const timeSinceLastCall = now - lastCallTime.current;
        const delay = Math.max(0, MIN_DELAY_MS - timeSinceLastCall);
        
        processedCallsRef.current.add(entregador.id);
        
        setTimeout(() => {
          lastCallTime.current = Date.now();
          setDisplayingCalled({ entregador, hasBebida: false });
          handleCallAnnouncement(entregador, false);
          
          setTimeout(() => {
            updateMutation.mutate({
              id: entregador.id,
              data: { 
                status: 'entregando',
                hora_saida: new Date().toISOString(),
              },
            });
            setDisplayingCalled(null);
          }, DISPLAY_TIME_MS);
        }, delay);
      }
    });

    // Limpar IDs de entregadores que não estão mais chamados
    processedCallsRef.current.forEach((id) => {
      const stillCalled = calledEntregadores.find((e) => e.id === id);
      const nowDelivering = deliveringQueue.find((e) => e.id === id);
      if (!stillCalled && !nowDelivering) {
        processedCallsRef.current.delete(id);
      }
    });
  }, [calledEntregadores, handleCallAnnouncement, updateMutation, deliveringQueue]);

  // Escutar chamadas de pagamento para TV via realtime e também via polling
  useEffect(() => {
    if (!user?.unidadeId) return;

    const pagamentosChannel = supabase
      .channel('tv-pagamentos')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'senhas_pagamento',
          filter: `unidade_id=eq.${user.unidadeId}`,
        },
        (payload) => {
          const novaSenha = payload.new as SenhaPagamento;
          if (novaSenha.status === 'chamado' && novaSenha.id !== lastPagamentoIdRef.current) {
            lastPagamentoIdRef.current = novaSenha.id;
            setDisplayingPagamento(novaSenha);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pagamentosChannel);
    };
  }, [user?.unidadeId]);

  // Atualizar exibição de pagamento com base nas senhas carregadas (fallback via polling)
  useEffect(() => {
    const chamadaAtual = senhasPagamento.find(
      (s) => s.status === 'chamado' && s.id !== lastPagamentoIdRef.current,
    );

    if (chamadaAtual) {
      lastPagamentoIdRef.current = chamadaAtual.id;
      setDisplayingPagamento(chamadaAtual);
    }
  }, [senhasPagamento]);

  const handleReturn = async (entregador: Entregador) => {
    try {
      await updateMutation.mutateAsync({
        id: entregador.id,
        data: { 
          status: 'disponivel',
          fila_posicao: new Date().toISOString(),
          hora_saida: null,
        },
      });
      
      // Calcular nova posição estimada (fila atual + ele voltando)
      const newPosition = availableQueue.length + 1;
      
      // Mensagem de feedback para o motoboy via WhatsApp
      const whatsappMessage = `Retorno confirmado! Você está na posição ${newPosition} da fila. Valeu pelo trampo! Logo mais tem nova rota para você.`;
      await sendWhatsAppMessage(entregador.telefone, whatsappMessage, {
        franquiaId: user.franquiaId ?? null,
        unidadeId: null,
      });
      
      refetch();
      refetchHistorico();
      toast.success(
        `Retorno confirmado! Você está na posição ${newPosition} da fila. Valeu pelo trampo! Logo mais tem nova rota para você.`,
        { duration: 5000 }
      );
    } catch (error) {
      toast.error('Erro ao registrar retorno');
    }
  };

  const handleCheckin = async (entregador: Entregador) => {
    try {
      await updateMutation.mutateAsync({
        id: entregador.id,
        data: { 
          ativo: true,
          status: 'disponivel',
          fila_posicao: new Date().toISOString(),
        },
      });
      toast.success(`${entregador.nome} entrou na fila!`);
      setCheckinOpen(false);
      refetch();
    } catch (error) {
      toast.error('Erro ao fazer check-in');
    }
  };

  // Animação premium quando alguém é chamado
  const handleAnimationComplete = () => {
    setDisplayingCalled(null);
  };

  const handlePagamentoAnimationComplete = () => {
    setDisplayingPagamento(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={CALL_AUDIO_URL} preload="auto" />

      {/* Animação Premium de Chamada (entrega ou pagamento) */}
       <TVCallAnimation
         show={!!displayingCalled || !!displayingPagamento}
         tipo={displayingPagamento ? 'PAGAMENTO' : 'ENTREGA'}
         nomeMotoboy={
           displayingPagamento?.entregador_nome ||
           displayingCalled?.entregador.nome ||
           ''
         }
         bagNome={
           displayingPagamento
             ? undefined
             : (() => {
                 const bagId = displayingCalled?.entregador.tipo_bag;
                 if (!bagId) return undefined;
                 return (
                   franquiaBagTipos.find((b) => b.id === bagId)?.nome || bagId
                 );
               })()
         }
         callPhrase={
           displayingPagamento && displayingPagamento.entregador_nome
             ? buildTvTexts(
                 displayingPagamento.entregador_nome,
                 undefined,
                 displayingPagamento.numero_senha,
               ).pagamentoText
             : (!displayingPagamento && displayingCalled
                 ? buildTvTexts(
                     displayingCalled.entregador.nome,
                     (() => {
                       const bagId = displayingCalled.entregador.tipo_bag;
                       if (!bagId) return undefined;
                       return franquiaBagTipos.find((b) => b.id === bagId)?.nome || bagId;
                     })(),
                   ).chamadaText
                 : undefined)
         }
         bagPhrase={
           !displayingPagamento && displayingCalled
             ? buildTvTexts(displayingCalled.entregador.nome, (() => {
                 const bagId = displayingCalled.entregador.tipo_bag;
                 if (!bagId) return undefined;
                 return franquiaBagTipos.find((b) => b.id === bagId)?.nome || bagId;
               })()).bagText
             : undefined
         }
         onComplete={displayingPagamento ? handlePagamentoAnimationComplete : handleAnimationComplete}
       />

      {/* Header - Logo sem link + faixa Top 5 */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-card/50 overflow-hidden relative">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Pizza className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <span className="font-mono font-bold text-xl">{displayName}</span>
            <span className="ml-3 px-3 py-1 rounded-full bg-secondary text-sm font-medium">
              {selectedUnit}
            </span>
          </div>
        </div>

        {/* Faixa Top 3 - Oscila entre saídas e entregas */}
        {top3.length > 0 && (
          <div className="flex-1 mx-8 hidden md:block">
            <div className="relative h-12 overflow-hidden rounded-full bg-secondary/70 border border-border">
              <div className="absolute inset-0 flex items-center gap-6 px-6">
              <span className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  {showDeliveries ? 'Os 3 que mais entregaram (aproximado)' : 'Os 3 que mais tiveram saídas'}
                </span>
                {top3.map((item, index) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const count = showDeliveries ? item.entregas : item.saidas;
                  const label = showDeliveries ? 'entregas' : 'saídas';
                  return (
                    <div
                      key={`${item.nome}-${index}`}
                      className="flex items-center gap-2 text-sm text-foreground whitespace-nowrap"
                    >
                      <span className="text-xl">{medals[index]}</span>
                      <span className="font-semibold">{item.nome}</span>
                      <span className="font-mono text-xs opacity-80 bg-background/40 px-2 py-0.5 rounded-full">{count} {label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Check-in button */}
          <Button
            onClick={() => setCheckinOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Check-in
          </Button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 text-muted-foreground" />
            ) : (
              <Volume2 className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-0 relative">
        {/* Left Column - Queue */}
        <div className="border-b lg:border-b-0 lg:border-r border-border p-4 sm:p-6 lg:p-8 overflow-hidden">
          <h2 className="text-2xl font-bold font-mono mb-4 sm:mb-6 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-status-available" />
            Fila de Espera ({availableQueue.length})
          </h2>

          {availableQueue.length === 0 ? (
            <div className="flex items-center justify-center h-48 sm:h-64">
              <p className="text-lg sm:text-xl text-muted-foreground">Nenhum entregador na fila</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {availableQueue.map((entregador, index) => (
                <div
                  key={entregador.id}
                  className="flex items-center gap-3 sm:gap-4 bg-card border border-border rounded-xl p-3 sm:p-4 animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-secondary flex items-center justify-center text-xl sm:text-2xl font-bold font-mono">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg sm:text-xl font-semibold truncate">
                      {entregador.nome}
                    </p>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-status-available flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Em Entrega com botão Voltar para Fila */}
        <div className="p-4 sm:p-6 lg:p-8 overflow-hidden">
          <h2 className="text-2xl font-bold font-mono mb-4 sm:mb-6 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-status-delivering" />
            Em Entrega ({deliveringQueue.length})
          </h2>

          {deliveringQueue.length === 0 ? (
            <div className="flex items-center justify-center h-48 sm:h-64">
              <div className="text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <User className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
                </div>
                <p className="text-lg sm:text-xl text-muted-foreground">Nenhum entregador em entrega</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {deliveringQueue.map((entregador, index) => (
                <div
                  key={entregador.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-card border border-border rounded-xl p-3 sm:p-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-14 h-14 rounded-full bg-status-delivering/20 flex items-center justify-center mx-auto sm:mx-0">
                    <User className="w-7 h-7 text-status-delivering" />
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="text-lg sm:text-xl font-semibold truncate">{entregador.nome}</p>
                    {entregador.tipo_bag && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-sm text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span className="truncate">
                          {franquiaBagTipos.find((b) => b.id === entregador.tipo_bag)?.nome || entregador.tipo_bag}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => handleReturn(entregador)}
                    disabled={updateMutation.isPending}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto gap-2 text-base sm:text-lg px-4 sm:px-6"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Voltar para Fila
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <footer className="px-8 py-3 border-t border-border bg-card/50 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Atualização automática a cada 10 segundos
        </span>
        <span className="text-sm text-muted-foreground font-mono">
          {currentTime.toLocaleTimeString('pt-BR')}
        </span>
      </footer>

      {/* Check-in Modal */}
      <CheckinModal
        open={checkinOpen}
        onOpenChange={setCheckinOpen}
        entregadores={entregadores}
        onCheckin={handleCheckin}
        isLoading={false}
      />
    </div>
  );
}