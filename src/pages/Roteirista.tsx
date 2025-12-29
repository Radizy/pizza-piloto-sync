import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Layout, BackButton } from '@/components/Layout';
import {
  fetchEntregadores,
  updateEntregador,
  sendWhatsAppMessage,
  createHistoricoEntrega,
  shouldShowInQueue,
  Entregador,
  TipoBag,
  sendDispatchWebhook,
} from '@/lib/api';
import { toast } from 'sonner';
import { Users, Loader2, Phone, GripVertical, SkipForward, UserMinus, LogOut, ArrowRight, MessageSquare, RotateCcw } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { NotAppearedModal } from '@/components/NotAppearedModal';
import { CallMotoboyModal } from '@/components/CallMotoboyModal';
import { ReturnToQueueModal } from '@/components/ReturnToQueueModal';
import { supabase } from '@/integrations/supabase/client';
import { TvPaymentPreview } from '@/components/TvPaymentPreview';

export default function Roteirista() {
  const { selectedUnit, setSelectedUnit } = useUnit();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // Garante que a unidade selecionada sempre siga a unidade do usuário logado
  useEffect(() => {
    if (user?.unidade && selectedUnit !== user.unidade) {
      setSelectedUnit(user.unidade as any);
    }
  }, [user, selectedUnit, setSelectedUnit]);
  
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [notAppearedOpen, setNotAppearedOpen] = useState(false);
  const [calledEntregador, setCalledEntregador] = useState<Entregador | null>(null);
  const [selectedEntregador, setSelectedEntregador] = useState<Entregador | null>(null);
  const [deliveryCount, setDeliveryCount] = useState(1);
  const [tipoBag, setTipoBag] = useState<TipoBag>('normal');
  const [hasBebida, setHasBebida] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Novos estados para as ações adicionais
  const [callMotoboyOpen, setCallMotoboyOpen] = useState(false);
  const [returnToQueueOpen, setReturnToQueueOpen] = useState(false);
  const [actionEntregador, setActionEntregador] = useState<Entregador | null>(null);

  // Tipos de BAG configurados para a franquia da unidade atual
  const { data: franquiaBagTipos = [], isLoading: isLoadingBags } = useQuery<{ id: string; nome: string; descricao: string | null; ativo: boolean; franquia_id: string }[]>({
    queryKey: ['franquia-bag-tipos', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) {
        return [];
      }
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

  const bagOptions = franquiaBagTipos.length
    ? franquiaBagTipos.map((b) => ({ id: b.id, label: b.nome, value: b.id }))
    : [
        { id: 'normal', label: 'BAG Normal', value: 'BAG Normal' },
        { id: 'metro', label: 'BAG Metro', value: 'BAG Metro' },
      ];

  // selectedUnit é usado apenas na renderização condicional mais abaixo para evitar erros de hooks


  // Query for fetching available entregadores
  const { data: entregadores = [], isLoading } = useQuery({
    queryKey: ['entregadores', selectedUnit, 'active'],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit, ativo: true }),
    refetchInterval: 5000,
    enabled: !!selectedUnit,
  });

  // Mutation for updating status
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Entregador> }) =>
      updateEntregador(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  // Filter by status and shift/workdays for display, liberando quem fez check-in recente
  const hasRecentCheckin = (entregador: Entregador) => {
    if (!entregador.fila_posicao) return false;
    const now = new Date().getTime();
    const filaTime = new Date(entregador.fila_posicao).getTime();
    const diffHours = (now - filaTime) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  const availableQueue = entregadores
    .filter((e) => e.status === 'disponivel' && (shouldShowInQueue(e) || hasRecentCheckin(e)));
  const calledQueue = entregadores.filter((e) => e.status === 'chamado');
  const deliveringQueue = entregadores.filter((e) => e.status === 'entregando');

  // Contagem aproximada de saídas do dia para a unidade atual
  const { data: saidasHoje } = useQuery<{ count: number }>({
    queryKey: ['saidas-dia', selectedUnit],
    enabled: !!selectedUnit,
    queryFn: async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from('historico_entregas')
        .select('id', { count: 'exact', head: true })
        .eq('unidade', selectedUnit as string)
        .gte('created_at', hoje.toISOString());
      if (error) throw error;
      return { count: count ?? 0 };
    },
  });
 
  // Próximo da fila
  const nextInQueue = availableQueue[0] || null;
  const secondInQueue = availableQueue[1] || null;

  const openCallDialog = () => {
    if (!nextInQueue) {
      toast.error('Nenhum entregador na fila!');
      return;
    }
    setSelectedEntregador(nextInQueue);
    setDeliveryCount(1);
    // Default da BAG: primeira opção configurada ou fallback
    const defaultBag = bagOptions[0]?.value || 'BAG Normal';
    setTipoBag(defaultBag as TipoBag);
    setHasBebida(false);
    setCallDialogOpen(true);
  };

  // Handler para "Não Apareceu" - move para 1ª posição
  const handleNotAppeared = async () => {
    if (!calledEntregador) return;
    
    try {
      // Mover para 1ª posição (timestamp mais antigo)
      const earliestTimestamp = new Date(0).toISOString();
      await updateMutation.mutateAsync({
        id: calledEntregador.id,
        data: { 
          status: 'disponivel',
          fila_posicao: earliestTimestamp,
        },
      });
      
      toast.info(`${calledEntregador.nome} foi movido para a 1ª posição da fila`);
      setNotAppearedOpen(false);
      setCalledEntregador(null);
    } catch (error) {
      toast.error('Erro ao reposicionar motoboy');
    }
  };

  const handleConfirmCall = async () => {
    if (!selectedEntregador) return;
    
    setIsSending(true);
    
    try {
      // Update status to "chamado" and set tipo_bag
      await updateMutation.mutateAsync({
        id: selectedEntregador.id,
        data: { 
          status: 'chamado',
          tipo_bag: tipoBag,
        },
      });

      // Create historico entry
      await createHistoricoEntrega({
        entregador_id: selectedEntregador.id,
        unidade: selectedUnit,
        tipo_bag: tipoBag,
      });

      // Disparar webhook de despacho (server-side)
      await sendDispatchWebhook({
        unidade: selectedUnit,
        entregador: selectedEntregador,
        quantidadeEntregas: deliveryCount,
        bag: tipoBag,
        hasBebida: hasBebida,
      });

      // Resolver nome da BAG a partir do ID (para franquias com tipos cadastrados)
      const bagName = franquiaBagTipos.find((b) => b.id === tipoBag)?.nome || tipoBag || '';

      // Send WhatsApp message with delivery count and bag type
      const bagMessage = bagName
        ? `🎒 Pegue a ${bagName.toUpperCase()}`
        : '🎒 Pegue a sua BAG';
      
      const bebidaMessage = hasBebida 
        ? '\n\n*⚠️ ATENÇÃO, NO SEUS PEDIDOS POSSUI BEBIDA*' 
        : '';
      
      const message = deliveryCount === 1 
        ? `🍕 Sua vez na unidade ${selectedUnit}! Você tem 1 entrega. ${bagMessage}. Vá ao balcão.${bebidaMessage}`
        : `🍕 Sua vez na unidade ${selectedUnit}! Você tem ${deliveryCount} entregas. ${bagMessage}. Vá ao balcão.${bebidaMessage}`;
      
      await sendWhatsAppMessage(selectedEntregador.telefone, message, {
        franquiaId: user?.franquiaId ?? null,
        unidadeId: null,
      });

      // Broadcast bebida info via realtime for TV
      if (hasBebida) {
        await supabase
          .from('entregadores')
          .update({ status: 'chamado' })
          .eq('id', selectedEntregador.id);
        
        // Store bebida info in localStorage for TV to pick up
        localStorage.setItem(`bebida_${selectedEntregador.id}`, 'true');
        setTimeout(() => localStorage.removeItem(`bebida_${selectedEntregador.id}`), 20000);
      }

      toast.success(`${selectedEntregador.nome} foi chamado com ${deliveryCount} entrega(s)!`);
      setCallDialogOpen(false);
      
      // Mostrar modal "Não Apareceu" por 5 segundos
      setCalledEntregador(selectedEntregador);
      setNotAppearedOpen(true);

      // Enviar mensagem para o segundo da fila após 5 segundos
      if (secondInQueue) {
        setTimeout(async () => {
           try {
             const alertMessage = `⚠️ Atenção ${secondInQueue.nome}! Você é o próximo da fila na unidade ${selectedUnit}. Fique alerta!`;
             await sendWhatsAppMessage(secondInQueue.telefone, alertMessage, {
               franquiaId: user?.franquiaId ?? null,
               unidadeId: null,
             });
             toast.info(`Alerta enviado para ${secondInQueue.nome}`);
           } catch (error) {
            console.error('Erro ao enviar alerta para segundo da fila:', error);
          }
        }, 5000);
      }
    } catch (error) {
      toast.error('Erro ao chamar entregador');
    } finally {
      setIsSending(false);
    }
  };

  // NOVAS AÇÕES PARA ROTEIRIZAÇÃO

  // 1. Mover para "Em Entrega" (apenas muda status, sem mensagem)
  const handleMoveToDelivering = async (entregador: Entregador) => {
    try {
      await updateMutation.mutateAsync({
        id: entregador.id,
        data: { 
          status: 'entregando',
          hora_saida: new Date().toISOString(),
        },
      });
      toast.success(`${entregador.nome} movido para Em Entrega`);
    } catch (error) {
      toast.error('Erro ao mover entregador');
    }
  };

  // 2. Chamar Motoboy (com motivo obrigatório + WhatsApp, não remove da fila)
  const handleCallMotoboy = async (motivo: string) => {
    if (!actionEntregador) return;
    
    setIsSending(true);
    try {
      const message = `🔔 *CHAMADA ESPECIAL*\n\nOlá ${actionEntregador.nome}!\n\nMotivo: ${motivo}\n\nPor favor, compareça ao balcão da unidade ${selectedUnit}.`;
      
      await sendWhatsAppMessage(actionEntregador.telefone, message, {
        franquiaId: user?.franquiaId ?? null,
        unidadeId: null,
      });

      toast.success(`Mensagem enviada para ${actionEntregador.nome}`);
      setCallMotoboyOpen(false);
      setActionEntregador(null);
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  // 3. Voltar para fila (de "Em Entrega" para "Disponível")
  const handleReturnToQueue = async () => {
    if (!actionEntregador) return;
    
    setIsSending(true);
    try {
      await updateMutation.mutateAsync({
        id: actionEntregador.id,
        data: { 
          status: 'disponivel',
          hora_saida: null,
          fila_posicao: new Date().toISOString(),
        },
      });
      
      toast.success(`${actionEntregador.nome} retornou para a fila`);
      setReturnToQueueOpen(false);
      setActionEntregador(null);
    } catch (error) {
      toast.error('Erro ao retornar entregador para fila');
    } finally {
      setIsSending(false);
    }
  };

  // Pular a vez do motoboy (vai para o fim da fila)
  const handleSkipTurn = async () => {
    if (!selectedEntregador || !skipReason.trim()) {
      toast.error('Informe o motivo para pular a vez');
      return;
    }

    try {
      // Move para o fim da fila atualizando fila_posicao
      await updateMutation.mutateAsync({
        id: selectedEntregador.id,
        data: { 
          fila_posicao: new Date().toISOString(),
        },
      });
      
      toast.success(`${selectedEntregador.nome} foi para o fim da fila. Motivo: ${skipReason}`);
      setSkipDialogOpen(false);
      setSkipReason('');
      setSelectedEntregador(null);
    } catch (error) {
      toast.error('Erro ao pular a vez');
    }
  };

  // Remover da fila (desativa temporariamente)
  const handleRemoveFromQueue = async (entregador: Entregador) => {
    try {
      await updateMutation.mutateAsync({
        id: entregador.id,
        data: { 
          ativo: false,
        },
      });
      
      toast.success(`${entregador.nome} foi removido da fila`);
    } catch (error) {
      toast.error('Erro ao remover da fila');
    }
  };

  // Handle drag and drop reorder
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    // Reorder the local array
    const reordered = [...availableQueue];
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(destIndex, 0, removed);

    // Update fila_posicao for all affected entregadores
    const now = new Date();
    const updates = reordered.map((entregador, index) => {
      // Create timestamps that preserve the new order
      const newTimestamp = new Date(now.getTime() + index * 1000).toISOString();
      return updateMutation.mutateAsync({
        id: entregador.id,
        data: { fila_posicao: newTimestamp },
      });
    });

    try {
      await Promise.all(updates);
      toast.success('Ordem da fila atualizada!');
    } catch (error) {
      toast.error('Erro ao reordenar fila');
    }
  };

  return (
    <Layout>
      <BackButton />

      <div className="mb-6">
        <h1 className="text-3xl font-bold font-mono mb-2">Roteirista</h1>
        <p className="text-muted-foreground">
          Controle da fila de entregas •{' '}
          <span className="font-semibold text-foreground">{selectedUnit}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Saídas aproximadas hoje: <span className="font-mono font-semibold">{saidasHoje?.count ?? 0}</span>
        </p>
      </div>

      {/* Botão Grande CHAMAR O PRÓXIMO */}
      <Button
        onClick={openCallDialog}
        disabled={!nextInQueue || isLoading}
        className="w-full h-24 text-2xl font-bold font-mono mb-8 bg-accent hover:bg-accent/90 text-accent-foreground gap-4"
      >
        <Phone className="w-8 h-8" />
        {nextInQueue ? (
          <>CHAMAR: {nextInQueue.nome.toUpperCase()}</>
        ) : (
          <>NENHUM NA FILA</>
        )}
      </Button>

      {/* Stats Row + TV preview (ao vivo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-status-available" />
            <span className="text-sm text-muted-foreground">Na fila</span>
          </div>
          <p className="text-3xl font-bold font-mono">{availableQueue.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-status-called animate-pulse" />
            <span className="text-sm text-muted-foreground">Chamados</span>
          </div>
          <p className="text-3xl font-bold font-mono">{calledQueue.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-status-delivering" />
            <span className="text-sm text-muted-foreground">Entregando</span>
          </div>
          <p className="text-3xl font-bold font-mono">{deliveringQueue.length}</p>
        </div>
        <TvPaymentPreview
          franquiaId={user?.franquiaId ?? null}
          unidadeNome={selectedUnit as any}
          unidadeId={user?.unidadeId ?? null}
          unidadeSlug={selectedUnit as any}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Available Queue with Drag and Drop */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Fila de Disponíveis ({availableQueue.length})
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (arraste para reordenar)
              </span>
            </h2>
            {availableQueue.length === 0 ? (
              <div className="text-center py-12 bg-card border border-dashed border-border rounded-lg">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum entregador disponível</p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="queue">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3"
                    >
                      {availableQueue.map((entregador, index) => (
                        <Draggable
                          key={entregador.id}
                          draggableId={entregador.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-4 bg-card border border-border rounded-xl p-4 transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''
                              }`}
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing p-2 hover:bg-secondary rounded-lg"
                              >
                                <GripVertical className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl font-bold font-mono">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-lg font-semibold">{entregador.nome}</p>
                                <p className="text-sm text-muted-foreground">{entregador.telefone}</p>
                              </div>
                              <div className="w-3 h-3 rounded-full bg-status-available" />
                              
                              {/* Dropdown menu para ações */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    Ações
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleMoveToDelivering(entregador)}
                                    className="gap-2"
                                  >
                                    <ArrowRight className="w-4 h-4" />
                                    Mover para Em Entrega
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedEntregador(entregador);
                                      setSkipReason('');
                                      setSkipDialogOpen(true);
                                    }}
                                    className="gap-2"
                                  >
                                    <SkipForward className="w-4 h-4" />
                                    Pular a vez
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRemoveFromQueue(entregador)}
                                    className="gap-2 text-destructive"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                    Remover da fila
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>

          {/* Delivering Queue */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              Em Entrega ({deliveringQueue.length})
            </h2>
            {deliveringQueue.length === 0 ? (
              <div className="text-center py-12 bg-card border border-dashed border-border rounded-lg">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum entregador em entrega no momento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveringQueue.map((entregador) => (
                  <div
                    key={entregador.id}
                    className="flex items-center gap-4 bg-card border border-border rounded-xl p-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xl font-bold font-mono text-orange-600">
                      {entregador.nome.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold">{entregador.nome}</p>
                      <p className="text-sm text-muted-foreground">{entregador.telefone}</p>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-status-delivering" />
                    
                    {/* Dropdown menu com novas ações */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Ações
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setActionEntregador(entregador);
                            setCallMotoboyOpen(true);
                          }}
                          className="gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Chamar Motoboy
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setActionEntregador(entregador);
                            setReturnToQueueOpen(true);
                          }}
                          className="gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Voltar para Fila
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-2xl">Chamar Entregador</DialogTitle>
          </DialogHeader>
          
          {selectedEntregador && (
            <div className="space-y-4 py-4">
              <div className="bg-accent/20 border-2 border-accent rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Próximo da fila</p>
                <p className="text-3xl font-bold font-mono text-accent">{selectedEntregador.nome}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedEntregador.telefone}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-lg">Quantas entregas?</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant={deliveryCount === num ? 'default' : 'outline'}
                      className="h-16 text-2xl font-mono"
                      onClick={() => setDeliveryCount(num)}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-lg">Tipo de BAG</Label>
                {isLoadingBags && user?.franquiaId ? (
                  <div className="text-sm text-muted-foreground">Carregando tipos de BAG...</div>
                ) : (
                  <RadioGroup
                    value={tipoBag}
                    onValueChange={(value) => setTipoBag(value as TipoBag)}
                    className="grid grid-cols-2 gap-4"
                  >
                    {bagOptions.map((bag) => (
                      <div key={bag.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={bag.id} id={`bag-${bag.id}`} />
                        <Label
                          htmlFor={`bag-${bag.id}`}
                          className="flex-1 cursor-pointer p-4 border-2 rounded-lg hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                        >
                          <div className="text-center">
                            <span className="text-2xl">🎒</span>
                            <p className="font-semibold mt-1">{bag.label}</p>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>

              {/* Opção de Bebida */}
              <div className="space-y-3">
                <Label className="text-lg">Tem bebida no pedido?</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setHasBebida(false)}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      !hasBebida 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-center">
                      <span className="text-2xl">❌</span>
                      <p className="font-semibold mt-1">Não</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasBebida(true)}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      hasBebida 
                        ? 'border-orange-500 bg-orange-500/10' 
                        : 'border-border hover:border-orange-500/50'
                    }`}
                  >
                    <div className="text-center">
                      <span className="text-2xl">🥤</span>
                      <p className="font-semibold mt-1">Sim, tem bebida</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setCallDialogOpen(false)}
              disabled={isSending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmCall}
              disabled={isSending}
              className="flex-1 bg-accent hover:bg-accent/90 text-lg h-12"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              CHAMAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip Dialog */}
      <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-xl">Pular a Vez</DialogTitle>
          </DialogHeader>
          
          {selectedEntregador && (
            <div className="space-y-4 py-4">
              <div className="bg-secondary rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Motoboy</p>
                <p className="text-xl font-bold font-mono">{selectedEntregador.nome}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="skipReason">Motivo para pular a vez</Label>
                <Textarea
                  id="skipReason"
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="Ex: Não estava pronto, foi ao banheiro..."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSkipDialogOpen(false);
                setSkipReason('');
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSkipTurn}
              disabled={!skipReason.trim()}
              className="flex-1"
            >
              Pular Vez
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal "Não Apareceu" */}
      <NotAppearedModal
        open={notAppearedOpen}
        entregador={calledEntregador}
        onClose={() => {
          setNotAppearedOpen(false);
          setCalledEntregador(null);
        }}
        onNotAppeared={handleNotAppeared}
        autoCloseMs={5000}
      />

      {/* Novos Modais */}
      <CallMotoboyModal
        open={callMotoboyOpen}
        onOpenChange={setCallMotoboyOpen}
        entregador={actionEntregador}
        onConfirm={handleCallMotoboy}
        isLoading={isSending}
      />

      <ReturnToQueueModal
        open={returnToQueueOpen}
        onOpenChange={setReturnToQueueOpen}
        entregador={actionEntregador}
        onConfirm={handleReturnToQueue}
        isLoading={isSending}
      />
    </Layout>
  );
}