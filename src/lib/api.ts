// Lovable Cloud API configuration
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert } from "@/integrations/supabase/types";

export type Unidade = 'ITAQUA' | 'POA' | 'SUZANO';
export type Status = 'disponivel' | 'chamado' | 'entregando';
// Tipo de bag configurável por franquia (valores livres)
export type TipoBag = string;

export interface DiasTrabalho {
  dom: boolean;
  seg: boolean;
  ter: boolean;
  qua: boolean;
  qui: boolean;
  sex: boolean;
  sab: boolean;
}

export interface Entregador {
  id: string;
  nome: string;
  telefone: string;
  unidade: Unidade;
  status: Status;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  fila_posicao?: string;
  dias_trabalho?: DiasTrabalho;
  usar_turno_padrao?: boolean;
  turno_inicio?: string;
  turno_fim?: string;
  hora_saida?: string;
  tipo_bag?: TipoBag;
  has_bebida?: boolean;
}

export interface CreateEntregadorData {
  nome: string;
  telefone: string;
  unidade: Unidade;
  status: Status;
  ativo: boolean;
  dias_trabalho?: DiasTrabalho;
  usar_turno_padrao?: boolean;
  turno_inicio?: string;
  turno_fim?: string;
}

export interface HistoricoEntrega {
  id: string;
  entregador_id: string;
  unidade: string;
  hora_saida: string;
  hora_retorno?: string;
  tipo_bag?: TipoBag;
  created_at: string;
}

export interface SystemConfig {
  id: string;
  unidade: string;
  webhook_url?: string;
  nome_loja?: string;
  created_at?: string;
  updated_at?: string;
}

// Turno padrão do sistema (16:00 às 02:00)
export const TURNO_PADRAO = {
  inicio: '16:00:00',
  fim: '02:00:00',
};

// Horário do expediente para histórico (17:00 às 02:00)
export const HORARIO_EXPEDIENTE = {
  inicio: 17,
  fim: 2,
};

// Verifica se o horário atual está dentro do turno
export function isWithinShift(turnoInicio: string, turnoFim: string): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [inicioHour, inicioMinute] = turnoInicio.split(':').map(Number);
  const [fimHour, fimMinute] = turnoFim.split(':').map(Number);
  
  const inicioTime = inicioHour * 60 + inicioMinute;
  const fimTime = fimHour * 60 + fimMinute;

  // Turno que atravessa a meia-noite (ex: 16:00 às 02:00)
  if (fimTime < inicioTime) {
    return currentTime >= inicioTime || currentTime <= fimTime;
  }
  
  // Turno normal (ex: 08:00 às 17:00)
  return currentTime >= inicioTime && currentTime <= fimTime;
}

// Verifica se hoje é um dia de trabalho
export function isWorkDay(diasTrabalho: DiasTrabalho): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, etc.
  
  const dayMap: Record<number, keyof DiasTrabalho> = {
    0: 'dom',
    1: 'seg',
    2: 'ter',
    3: 'qua',
    4: 'qui',
    5: 'sex',
    6: 'sab',
  };
  
  return diasTrabalho[dayMap[dayOfWeek]] ?? true;
}

// Verifica se o entregador deve aparecer na fila
export function shouldShowInQueue(entregador: Entregador): boolean {
  if (!entregador.ativo) return false;
  
  // Verificar dias de trabalho
  const diasTrabalho = entregador.dias_trabalho || {
    dom: true, seg: true, ter: true, qua: true, qui: true, sex: true, sab: true
  };
  
  if (!isWorkDay(diasTrabalho)) return false;
  
  // Verificar turno
  const turnoInicio = entregador.usar_turno_padrao !== false 
    ? TURNO_PADRAO.inicio 
    : (entregador.turno_inicio || TURNO_PADRAO.inicio);
  const turnoFim = entregador.usar_turno_padrao !== false 
    ? TURNO_PADRAO.fim 
    : (entregador.turno_fim || TURNO_PADRAO.fim);
  
  if (!isWithinShift(turnoInicio, turnoFim)) return false;
  
  return true;
}

// Função removida - failsafe de 1 hora não mais necessário

// Fetch all entregadores with optional filters
export async function fetchEntregadores(filters?: {
  unidade?: Unidade;
  status?: Status;
  ativo?: boolean;
}): Promise<Entregador[]> {
  let query = supabase
    .from('entregadores')
    .select('id, nome, telefone, status, unidade, ativo, created_at, updated_at, fila_posicao, dias_trabalho, usar_turno_padrao, turno_inicio, turno_fim, hora_saida, tipo_bag')
    .order('fila_posicao', { ascending: true });

  if (filters?.unidade) {
    query = query.eq('unidade', filters.unidade);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.ativo !== undefined) {
    query = query.eq('ativo', filters.ativo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to fetch entregadores: ' + error.message);
  }

  return (data || []) as unknown as Entregador[];
}

// Create new entregador
export async function createEntregador(data: CreateEntregadorData): Promise<Entregador> {
  const insertData: Record<string, unknown> = {
    nome: data.nome,
    telefone: data.telefone,
    unidade: data.unidade,
    status: data.status,
    ativo: data.ativo,
    usar_turno_padrao: data.usar_turno_padrao,
    turno_inicio: data.turno_inicio,
    turno_fim: data.turno_fim,
  };

  if (data.dias_trabalho) {
    insertData.dias_trabalho = data.dias_trabalho;
  }

  const { data: result, error } = await supabase
    .from('entregadores')
    .insert(insertData as { nome: string; telefone: string; unidade: string })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create entregador: ' + error.message);
  }

  return result as unknown as Entregador;
}

// Update entregador
export async function updateEntregador(
  id: string,
  data: Partial<Entregador>
): Promise<Entregador> {
  const updateData: Record<string, unknown> = {};
  
  // Copy all properties except dias_trabalho
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'dias_trabalho') {
      updateData[key] = value;
    }
  });

  // Handle dias_trabalho separately to avoid type issues
  if (data.dias_trabalho !== undefined) {
    updateData.dias_trabalho = data.dias_trabalho;
  }
  
  const { data: result, error } = await supabase
    .from('entregadores')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update entregador: ' + error.message);
  }

  return result as unknown as Entregador;
}

// Delete entregador
export async function deleteEntregador(id: string): Promise<void> {
  const { error } = await supabase
    .from('entregadores')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('Failed to delete entregador: ' + error.message);
  }
}

// Send WhatsApp message via Edge Function
export async function sendWhatsAppMessage(
  telefone: string,
  message: string,
  context?: { franquiaId?: string | null; unidadeId?: string | null }
): Promise<void> {
  const { error } = await supabase.functions.invoke('send-whatsapp', {
    body: {
      telefone,
      message,
      unidade_id: context?.unidadeId ?? null,
      franquia_id: context?.franquiaId ?? null,
    },
  });

  if (error) {
    console.error('Failed to send WhatsApp message:', error);
    throw new Error('Failed to send WhatsApp message');
  }
}

// Disparar webhook de despacho (server-side)
export async function sendDispatchWebhook(params: {
  unidade: Unidade;
  entregador: Entregador;
  quantidadeEntregas: number;
  bag: TipoBag;
  hasBebida?: boolean;
}): Promise<void> {
  try {
    // Buscar URL do webhook configurada para a unidade
    const { data: config, error: configError } = await supabase
      .from('system_config')
      .select('webhook_url')
      .eq('unidade', params.unidade)
      .maybeSingle();

    if (configError) {
      console.error('Erro ao buscar config de webhook:', configError);
      return;
    }

    const webhookUrl = config?.webhook_url;
    if (!webhookUrl) {
      // Webhook não configurado, não faz nada
      return;
    }

    const horarioSaida = new Date().toISOString();

    const payload = {
      nome: params.entregador.nome,
      horario_saida: horarioSaida,
      quantidade_entregas: String(params.quantidadeEntregas),
      motoboy: params.entregador.nome,
      bag: params.bag,
      possui_bebida: params.hasBebida ? 'SIM' : 'NAO',
    };

    const { error } = await supabase.functions.invoke('send-webhook', {
      body: {
        webhookUrl,
        payload,
      },
    });

    if (error) {
      console.error('Erro ao enviar webhook de despacho:', error);
    }
  } catch (err) {
    console.error('Falha inesperada ao enviar webhook de despacho:', err);
  }
}

// Histórico de entregas
export async function fetchHistoricoEntregas(filters: {
  unidade: Unidade;
  dataInicio: string;
  dataFim: string;
}): Promise<HistoricoEntrega[]> {
  const { data, error } = await supabase
    .from('historico_entregas')
    .select('*')
    .eq('unidade', filters.unidade)
    .gte('hora_saida', filters.dataInicio)
    .lte('hora_saida', filters.dataFim)
    .order('hora_saida', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch historico: ' + error.message);
  }

  return (data || []) as HistoricoEntrega[];
}

export async function createHistoricoEntrega(data: {
  entregador_id: string;
  unidade: string;
  tipo_bag?: TipoBag;
}): Promise<HistoricoEntrega> {
  const { data: result, error } = await supabase
    .from('historico_entregas')
    .insert({
      entregador_id: data.entregador_id,
      unidade: data.unidade,
      hora_saida: new Date().toISOString(),
      tipo_bag: data.tipo_bag || 'normal',
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create historico: ' + error.message);
  }

  return result as HistoricoEntrega;
}

export async function updateHistoricoEntrega(
  id: string,
  data: Partial<HistoricoEntrega>
): Promise<HistoricoEntrega> {
  const { data: result, error } = await supabase
    .from('historico_entregas')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update historico: ' + error.message);
  }

  return result as HistoricoEntrega;
}

export async function deleteOldHistorico(unidade: Unidade): Promise<void> {
  // Limpa histórico do dia anterior às 12:00
  const now = new Date();
  if (now.getHours() >= 12) {
    // Calcula o início do expediente de ontem (17:00)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(17, 0, 0, 0);

    const { error } = await supabase
      .from('historico_entregas')
      .delete()
      .eq('unidade', unidade)
      .lt('hora_saida', yesterday.toISOString());

    if (error) {
      console.error('Failed to delete old historico:', error);
    }
  }
}

// Subscribe to realtime changes
export function subscribeToEntregadores(
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel('entregadores-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'entregadores'
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Buscar posição do motoboy na fila (busca global por telefone)
export async function getMotoboyPosition(telefone: string): Promise<{
  position: number | null;
  nome: string | null;
  status: Status | null;
}> {
  // Busca todos os entregadores ativos em todas as unidades
  const entregadores = await fetchEntregadores({ ativo: true });

  const entregador = entregadores.find(e => e.telefone === telefone);

  if (!entregador) {
    return { position: null, nome: null, status: null };
  }

  // Fila da unidade específica do motoboy
  const activeQueue = entregadores
    .filter(e => e.unidade === entregador.unidade)
    .filter(e => shouldShowInQueue(e) && e.status === 'disponivel');

  if (entregador.status !== 'disponivel') {
    return { position: null, nome: entregador.nome, status: entregador.status };
  }

  const position = activeQueue.findIndex(e => e.id === entregador.id) + 1;

  return {
    position: position > 0 ? position : null,
    nome: entregador.nome,
    status: entregador.status,
  };
}

// Fetch system config for unit
export async function fetchSystemConfig(unidade: Unidade): Promise<SystemConfig | null> {
  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .eq('unidade', unidade)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch system config:', error);
    return null;
  }

  return data as unknown as SystemConfig;
}

// Update system config
export async function updateSystemConfig(
  unidade: Unidade,
  data: Partial<SystemConfig>
): Promise<void> {
  const { data: existing } = await supabase
    .from('system_config')
    .select('id')
    .eq('unidade', unidade)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('system_config')
      .update(data as any)
      .eq('unidade', unidade);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('system_config')
      .insert({ unidade, ...data } as any);
    if (error) throw error;
  }
}

// Fetch global config
export async function fetchGlobalConfig(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('global_config')
    .select('config_value')
    .eq('config_key', key)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch global config:', error);
    return null;
  }

  return data?.config_value || null;
}

// Update global config
export async function updateGlobalConfig(key: string, value: string): Promise<void> {
  const { data: existing } = await supabase
    .from('global_config')
    .select('id')
    .eq('config_key', key)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('global_config')
      .update({ config_value: value })
      .eq('config_key', key);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('global_config')
      .insert({ config_key: key, config_value: value });
    if (error) throw error;
  }
}

// ========== MÓDULOS OPCIONAIS (FEATURE FLAGS) ==========

export interface Modulo {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  ativo: boolean;
  created_at: string;
}

export interface UnidadeModulo {
  id: string;
  unidade_id: string;
  modulo_codigo: string;
  ativo: boolean;
  data_ativacao: string;
  data_expiracao: string | null;
  created_at: string;
}

export async function fetchModulos(): Promise<Modulo[]> {
  const { data, error } = await supabase
    .from('modulos')
    .select('*')
    .eq('ativo', true)
    .order('nome');
  if (error) throw error;
  return data || [];
}

export async function fetchUnidadeModulos(unidadeId: string): Promise<UnidadeModulo[]> {
  const { data, error } = await supabase
    .from('unidade_modulos')
    .select('*')
    .eq('unidade_id', unidadeId);
  if (error) throw error;
  return data || [];
}

export async function isModuloAtivo(unidadeId: string, moduloCodigo: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('unidade_modulos')
    .select('ativo, data_expiracao')
    .eq('unidade_id', unidadeId)
    .eq('modulo_codigo', moduloCodigo)
    .eq('ativo', true)
    .maybeSingle();
  
  if (error || !data) return false;
  
  // Verificar se expirou
  if (data.data_expiracao) {
    const expiracao = new Date(data.data_expiracao);
    if (expiracao < new Date()) {
      return false;
    }
  }
  
  return true;
}

export async function ativarModulo(unidadeId: string, moduloCodigo: string, diasTrial?: number) {
  const dataExpiracao = diasTrial ? new Date(Date.now() + diasTrial * 24 * 60 * 60 * 1000).toISOString() : null;
  
  const { error } = await supabase
    .from('unidade_modulos')
    .upsert({
      unidade_id: unidadeId,
      modulo_codigo: moduloCodigo,
      ativo: true,
      data_expiracao: dataExpiracao,
    });
  
  if (error) throw error;
}

export async function desativarModulo(unidadeId: string, moduloCodigo: string) {
  const { error } = await supabase
    .from('unidade_modulos')
    .update({ ativo: false })
    .eq('unidade_id', unidadeId)
    .eq('modulo_codigo', moduloCodigo);
  
  if (error) throw error;
}

// ========== SENHAS DE PAGAMENTO ==========

export interface SenhaPagamento {
  id: string;
  unidade_id: string;
  franquia_id: string;
  numero_senha: string;
  entregador_id: string | null;
  entregador_nome: string | null;
  status: 'aguardando' | 'chamado' | 'atendido' | 'expirado';
  chamado_em: string | null;
  atendido_em: string | null;
  expira_em: string;
  created_at: string;
  updated_at: string;
}

export async function gerarSenhaPagamento(
  unidadeId: string,
  franquiaId: string,
  entregadorId?: string,
  entregadorNome?: string,
): Promise<SenhaPagamento> {
  // Buscar última senha do dia para gerar número sequencial
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const { data: senhasHoje, error: errorBusca } = await supabase
    .from('senhas_pagamento')
    .select('numero_senha')
    .eq('unidade_id', unidadeId)
    .gte('created_at', hoje.toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (errorBusca) throw errorBusca;
  
  let proximoNumero = 1;
  if (senhasHoje && senhasHoje.length > 0) {
    const ultimaSenha = senhasHoje[0].numero_senha;
    const numero = parseInt(ultimaSenha.replace('P', ''));
    proximoNumero = numero + 1;
  }
  
  const numeroSenha = `P${proximoNumero.toString().padStart(3, '0')}`;
  
  const { data, error } = await supabase
    .from('senhas_pagamento')
    .insert({
      unidade_id: unidadeId,
      franquia_id: franquiaId,
      numero_senha: numeroSenha,
      entregador_id: entregadorId || null,
      entregador_nome: entregadorNome || null,
      status: 'aguardando',
    })
    .select()
    .single();
  
  if (error) throw error;

  const senha = data as SenhaPagamento;

  // Após gerar a senha, enviar mensagem inicial para o motoboy ficar atento ao celular
  try {
    // Buscar unidade para obter nome_loja
    const { data: unidade, error: unidadeError } = await supabase
      .from('unidades')
      .select('id, nome_loja')
      .eq('id', unidadeId)
      .maybeSingle();

    if (unidadeError) {
      console.error('Erro ao buscar unidade ao gerar senha de pagamento:', unidadeError);
    }

    // Buscar telefone e nome do entregador, se existir vínculo
    let telefone: string | null = null;
    let nomeMotoboy: string | null = senha.entregador_nome;

    if (senha.entregador_id) {
      const { data: entregador, error: entregadorError } = await supabase
        .from('entregadores')
        .select('telefone, nome')
        .eq('id', senha.entregador_id)
        .maybeSingle();

      if (entregadorError) {
        console.error('Erro ao buscar entregador ao gerar senha de pagamento:', entregadorError);
      } else if (entregador) {
        telefone = entregador.telefone as string;
        nomeMotoboy = (entregador.nome as string) || nomeMotoboy;
      }
    }

    // Buscar template de mensagem "aguardando pagamento" na configuração da franquia
    let mensagem = '';

    if (franquiaId) {
      const { data: franquia, error: franquiaError } = await supabase
        .from('franquias')
        .select('config_pagamento')
        .eq('id', franquiaId)
        .maybeSingle();

      if (franquiaError) {
        console.error('Erro ao buscar config_pagamento da franquia ao gerar senha:', franquiaError);
      } else if (franquia?.config_pagamento) {
        const tvPrompts = (franquia.config_pagamento as any).tv_prompts || {};
        const template: string =
          tvPrompts.pagamento_aguardando ||
          'Olá {nome}, sua senha é {senha}. Fique atento ao seu celular, em breve chamaremos para pagamento.';

        mensagem = template
          .replace('{nome}', nomeMotoboy || '')
          .replace('{senha}', senha.numero_senha)
          .replace('{unidade}', (unidade?.nome_loja as string) || '');
      }
    }

    if (telefone && mensagem) {
      await sendWhatsAppMessage(telefone, mensagem, {
        franquiaId,
        unidadeId: senha.unidade_id,
      });
    }
  } catch (whatsError) {
    console.error('Erro ao enviar WhatsApp ao gerar senha de pagamento:', whatsError);
  }

  return senha;
}

export async function fetchSenhasPagamento(unidadeId: string): Promise<SenhaPagamento[]> {
  const { data, error } = await supabase
    .from('senhas_pagamento')
    .select('*')
    .eq('unidade_id', unidadeId)
    .gt('expira_em', new Date().toISOString())
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return (data || []) as SenhaPagamento[];
}

export async function chamarSenhaPagamento(senhaId: string) {
  // Buscar detalhes da senha
  const { data: senha, error: senhaError } = await supabase
    .from('senhas_pagamento')
    .select('id, numero_senha, unidade_id, franquia_id, entregador_id, entregador_nome')
    .eq('id', senhaId)
    .maybeSingle();

  if (senhaError || !senha) {
    throw senhaError || new Error('Senha não encontrada');
  }

  // Buscar unidade para obter nome_loja e franquia
  const { data: unidade, error: unidadeError } = await supabase
    .from('unidades')
    .select('id, nome_loja, franquia_id')
    .eq('id', senha.unidade_id)
    .maybeSingle();

  if (unidadeError) {
    console.error('Erro ao buscar unidade da senha de pagamento:', unidadeError);
  }

  const franquiaId = (senha as any).franquia_id || unidade?.franquia_id || null;

  // Buscar telefone e nome do entregador, se existir vínculo
  let telefone: string | null = null;
  let nomeMotoboy: string | null = senha.entregador_nome;

  if (senha.entregador_id) {
    const { data: entregador, error: entregadorError } = await supabase
      .from('entregadores')
      .select('telefone, nome')
      .eq('id', senha.entregador_id)
      .maybeSingle();

    if (entregadorError) {
      console.error('Erro ao buscar entregador da senha de pagamento:', entregadorError);
    } else if (entregador) {
      telefone = entregador.telefone as string;
      nomeMotoboy = (entregador.nome as string) || nomeMotoboy;
    }
  }

  // Buscar template de mensagem de pagamento na configuração da franquia
  let mensagem = '';

  if (franquiaId) {
    const { data: franquia, error: franquiaError } = await supabase
      .from('franquias')
      .select('config_pagamento')
      .eq('id', franquiaId)
      .maybeSingle();

    if (franquiaError) {
      console.error('Erro ao buscar config_pagamento da franquia:', franquiaError);
    } else if (franquia?.config_pagamento) {
      const tvPrompts = (franquia.config_pagamento as any).tv_prompts || {};
      const template: string =
        tvPrompts.pagamento_chamada ||
        'Olá {nome}, é a sua vez de receber. Vá até o escritório (caixa) da {unidade} para receber.';

      mensagem = template
        .replace('{nome}', nomeMotoboy || '')
        .replace('{senha}', senha.numero_senha)
        .replace('{unidade}', (unidade?.nome_loja as string) || '');
    }
  }

  // Enviar WhatsApp se tivermos telefone e mensagem
  if (telefone && mensagem) {
    await sendWhatsAppMessage(telefone, mensagem, {
      franquiaId: franquiaId,
      unidadeId: senha.unidade_id,
    });
  }

  // Atualizar status da senha para chamado
  const { error } = await supabase
    .from('senhas_pagamento')
    .update({
      status: 'chamado',
      chamado_em: new Date().toISOString(),
    })
    .eq('id', senhaId);

  if (error) throw error;
}

export async function atenderSenhaPagamento(senhaId: string) {
  const { error } = await supabase
    .from('senhas_pagamento')
    .update({
      status: 'atendido',
      atendido_em: new Date().toISOString(),
    })
    .eq('id', senhaId);
  
  if (error) throw error;
}