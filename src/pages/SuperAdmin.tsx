import React from 'react';
import { Layout } from '@/components/Layout';
import { UsersManagement } from '@/components/UsersManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Loader2, Building2, Store, Users, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Unidade } from '@/lib/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FranquiaBagsSection } from '@/components/FranquiaBagsSection';
import { PlanosModulosSection } from '@/components/PlanosModulosSection';

interface Franquia {
  id: string;
  nome_franquia: string;
  slug: string;
  plano_limite_lojas: number | null;
  status_pagamento: string | null;
  config_pagamento: any | null;
  data_vencimento: string | null;
}

interface UnidadeResumo {
  id: string;
  nome_loja: string;
  franquia_id: string;
}

interface Plano {
  id: string;
  nome: string;
  tipo: 'mensal' | 'anual';
  valor_base: number;
  descricao: string | null;
  duracao_meses: number;
  ativo: boolean;
}

interface UnidadePlano {
  id: string;
  unidade_id: string;
  plano_id: string;
  valor: number;
  desconto_percent: number;
  ativo: boolean;
}

export default function SuperAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setSelectedUnit } = useUnit();

  const [selectedAdminUnit, setSelectedAdminUnit] = React.useState<string>('MASTER');
  const [searchFranquia, setSearchFranquia] = React.useState('');
  const [quickAccessSearch, setQuickAccessSearch] = React.useState('');

  const [editingFranquia, setEditingFranquia] = React.useState<Franquia | null>(null);
  const [isFranquiaDialogOpen, setIsFranquiaDialogOpen] = React.useState(false);
  const [franquiaForm, setFranquiaForm] = React.useState({
    nome_franquia: '',
    slug: '',
    plano_limite_lojas: 1,
    status_pagamento: 'ativo',
    provider: 'asas',
    api_key: '',
    webhook_url: '',
    evolution_url: '',
    evolution_instance: '',
    evolution_api_key: '',
    data_vencimento: '',
    plano_id: '',
    valor_plano: '',
    admin_user_ids: [] as string[],
    modulos_ativos: [] as string[],
  });

  const [editingPlano, setEditingPlano] = React.useState<Plano | null>(null);
  const [isPlanoDialogOpen, setIsPlanoDialogOpen] = React.useState(false);
  const [planoForm, setPlanoForm] = React.useState({
    nome: '',
    tipo: 'mensal' as 'mensal' | 'anual',
    valor_base: '0',
    descricao: '',
    duracao_meses: '1',
    ativo: true,
  });

  const [selectedPlanoUnidade, setSelectedPlanoUnidade] = React.useState({
    unidadeId: '',
    planoId: '',
    valor: '',
    desconto: '',
  });

  const [editingLoja, setEditingLoja] = React.useState<UnidadeResumo | null>(null);
  const [isLojaDialogOpen, setIsLojaDialogOpen] = React.useState(false);
  const [lojaForm, setLojaForm] = React.useState({
    nome_loja: '',
    franquia_id: '',
    user_id: 'none',
  });

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  const { data: franquias = [], isLoading: isLoadingFranquias } = useQuery<Franquia[]>({
    queryKey: ['franquias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franquias')
        .select('id, nome_franquia, slug, plano_limite_lojas, status_pagamento, config_pagamento, data_vencimento')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Franquia[];
    },
  });

  const { data: unidades = [] } = useQuery<UnidadeResumo[]>({
    queryKey: ['unidades-resumo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidades')
        .select('id, nome_loja, franquia_id');
      if (error) throw error;
      return data as UnidadeResumo[];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['system-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_users')
        .select('id, username, unidade_id, franquia_id, role');
      if (error) throw error;
      return data as {
        id: string;
        username: string;
        unidade_id: string | null;
        franquia_id: string | null;
        role: 'admin' | 'user';
      }[];
    },
  });

  const { data: planos = [] } = useQuery<Plano[]>({
    queryKey: ['planos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos')
        .select('id, nome, tipo, valor_base, descricao, duracao_meses, ativo')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Plano[];
    },
  });

  const { data: unidadesPlanos = [] } = useQuery<UnidadePlano[]>({
    queryKey: ['unidade-planos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidade_planos')
        .select('id, unidade_id, plano_id, valor, desconto_percent, ativo');
      if (error) throw error;
      return data as UnidadePlano[];
    },
  });

  const { data: modulosGlobais = [] } = useQuery<{
    id: string;
    codigo: string;
    nome: string;
  }[]>({
    queryKey: ['modulos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modulos')
        .select('id, codigo, nome');
      if (error) throw error;
      return data as any;
    },
  });

  const totalLojas = unidades.length;
  const totalFranquias = franquias.length;
  const totalUsuarios = users.length;
  
  const filteredFranquias = franquias.filter((f) => {
    if (!searchFranquia.trim()) return true;
    const term = searchFranquia.toLowerCase();
    return (
      f.nome_franquia.toLowerCase().includes(term) ||
      f.slug.toLowerCase().includes(term)
    );
  });

  // Lojas para acesso rápido com busca por nome ou franquia
  const quickAccessUnits = unidades.filter((u) => {
    if (!quickAccessSearch.trim()) return true;
    const term = quickAccessSearch.toLowerCase();
    const franquia = franquias.find((f) => f.id === u.franquia_id);
    return (
      u.nome_loja.toLowerCase().includes(term) ||
      (franquia && franquia.nome_franquia.toLowerCase().includes(term))
    );
  });

  // Dados para gráficos financeiros
  const franquiasFinanceiro = franquias.map((f) => {
    const lojasDaFranquia = unidades.filter((u) => u.franquia_id === f.id);
    const lojasIds = lojasDaFranquia.map((u) => u.id);
    const planosDaFranquia = unidadesPlanos.filter(
      (up) => up.ativo && lojasIds.includes(up.unidade_id)
    );

    const faturamentoEstimado = planosDaFranquia.reduce((acc, up) => acc + Number(up.valor), 0);

    return {
      id: f.id,
      nome: f.nome_franquia,
      faturamentoEstimado,
      lojas: lojasDaFranquia.length,
    };
  });

  const openNewFranquiaDialog = () => {
    setEditingFranquia(null);
    setFranquiaForm({
      nome_franquia: '',
      slug: '',
      plano_limite_lojas: 1,
      status_pagamento: 'ativo',
      provider: 'asas',
      api_key: '',
      webhook_url: '',
      evolution_url: '',
      evolution_instance: '',
      evolution_api_key: '',
      data_vencimento: '',
      plano_id: '',
      valor_plano: '',
      admin_user_ids: [],
      modulos_ativos: [],
    });
    setIsFranquiaDialogOpen(true);
  };

  const openEditFranquiaDialog = (franquia: Franquia) => {
    const cfg = (franquia.config_pagamento as any) || {};
    const adminsForFranquia = users.filter(
      (u) => u.franquia_id === franquia.id && u.role === 'admin'
    );
    const whatsapp = cfg.whatsapp || {};
    setEditingFranquia(franquia);
    setFranquiaForm({
      nome_franquia: franquia.nome_franquia,
      slug: franquia.slug,
      plano_limite_lojas: franquia.plano_limite_lojas ?? 1,
      status_pagamento: franquia.status_pagamento ?? 'ativo',
      provider: cfg.provider || 'asas',
      api_key: cfg.api_key || '',
      webhook_url: cfg.webhook_url || '',
      evolution_url: whatsapp.url || '',
      evolution_instance: whatsapp.instance || cfg.evolution_instance || '',
      evolution_api_key: whatsapp.api_key || '',
      data_vencimento: franquia.data_vencimento || '',
      plano_id: cfg.plano_id || '',
      valor_plano: cfg.valor_plano != null ? String(cfg.valor_plano) : '',
      admin_user_ids: adminsForFranquia.map((u) => u.id),
      modulos_ativos: (cfg.modulos_ativos as string[]) || [],
    });
    setIsFranquiaDialogOpen(true);
  };

  const openNewLojaForFranquia = (franquiaId: string) => {
    setEditingLoja(null);
    setLojaForm({
      nome_loja: '',
      franquia_id: franquiaId,
      user_id: 'none',
    });
    setIsLojaDialogOpen(true);
  };

  const openEditLojaDialog = (loja: UnidadeResumo) => {
    setEditingLoja(loja);
    // tentar pré-selecionar usuário responsável atual (se houver)
    const currentUserForLoja = users.find((u) => u.unidade_id === loja.id);
    setLojaForm({
      nome_loja: loja.nome_loja,
      franquia_id: loja.franquia_id,
      user_id: currentUserForLoja?.id ?? 'none',
    });
    setIsLojaDialogOpen(true);
  };

  const deleteLoja = async (loja: UnidadeResumo) => {
    if (!confirm(`Excluir a loja "${loja.nome_loja}"?`)) return;

    // Desvincula usuários dessa loja e remove a unidade
    const { error: userError } = await supabase
      .from('system_users')
      .update({ unidade_id: null })
      .eq('unidade_id', loja.id);

    if (userError) {
      toast.error(userError.message);
      return;
    }

    const { error: unidadeError } = await supabase
      .from('unidades')
      .delete()
      .eq('id', loja.id);

    if (unidadeError) {
      toast.error(unidadeError.message);
      return;
    }

    toast.success('Loja excluída com sucesso');
    queryClient.invalidateQueries({ queryKey: ['unidades-resumo'] });
    queryClient.invalidateQueries({ queryKey: ['system-users'] });
  };
  const upsertFranquiaMutation = useMutation({
    mutationFn: async () => {
      const nome = franquiaForm.nome_franquia.trim();
      const slug = (franquiaForm.slug || franquiaForm.nome_franquia)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');

      if (!nome) {
        throw new Error('Nome da franquia é obrigatório');
      }

      if (franquiaForm.admin_user_ids.length === 0) {
        throw new Error('Selecione pelo menos um usuário administrador para a franquia');
      }

      const payload = {
        nome_franquia: nome,
        slug,
        plano_limite_lojas: franquiaForm.plano_limite_lojas,
        status_pagamento: franquiaForm.status_pagamento,
        config_pagamento: {
          provider: franquiaForm.provider,
          api_key: franquiaForm.api_key,
          webhook_url: franquiaForm.webhook_url,
          whatsapp:
            franquiaForm.evolution_url &&
            franquiaForm.evolution_api_key &&
            franquiaForm.evolution_instance
              ? {
                  url: franquiaForm.evolution_url,
                  api_key: franquiaForm.evolution_api_key,
                  instance: franquiaForm.evolution_instance,
                }
              : null,
          plano_id: franquiaForm.plano_id || null,
          valor_plano: franquiaForm.valor_plano
            ? Number(franquiaForm.valor_plano.replace(',', '.'))
            : null,
          modulos_ativos: franquiaForm.modulos_ativos,
        },
        data_vencimento: franquiaForm.data_vencimento || null,
      };

      let franquiaId: string;

      if (editingFranquia) {
        franquiaId = editingFranquia.id;
        const { error } = await supabase
          .from('franquias')
          .update(payload)
          .eq('id', editingFranquia.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('franquias')
          .insert([payload])
          .select('id')
          .single();
        if (error) throw error;
        franquiaId = data.id;
      }

      // Garante que os usuários selecionados sejam admins da franquia
      const { error: userError } = await supabase
        .from('system_users')
        .update({ role: 'admin', franquia_id: franquiaId, unidade_id: null })
        .in('id', franquiaForm.admin_user_ids);
      if (userError) throw userError;

      // Multi-loja: garante acesso dos admins a todas as lojas da franquia via user_unidades
      const lojasDaFranquia = unidades.filter((u) => u.franquia_id === franquiaId);
      const unidadeIds = lojasDaFranquia.map((u) => u.id);
      if (unidadeIds.length > 0) {
        // Remove vínculos antigos para estes admins nessas lojas
        await supabase
          .from('user_unidades')
          .delete()
          .in('user_id', franquiaForm.admin_user_ids)
          .in('unidade_id', unidadeIds);

        // Cria vínculos novos (admin multi-loja)
        const novosVinculos = franquiaForm.admin_user_ids.flatMap((userId) =>
          unidadeIds.map((uid) => ({ user_id: userId, unidade_id: uid }))
        );
        if (novosVinculos.length > 0) {
          await supabase.from('user_unidades').insert(novosVinculos);
        }
      }
    },
    onSuccess: () => {
      toast.success('Franquia salva com sucesso');
      queryClient.invalidateQueries({ queryKey: ['franquias'] });
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      setIsFranquiaDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar franquia');
    },
  });

  const renovarFranquiaMutation = useMutation({
    mutationFn: async (franquia: Franquia) => {
      const baseDate = franquia.data_vencimento
        ? new Date(franquia.data_vencimento)
        : new Date();
      const novaData = new Date(baseDate.getTime());
      novaData.setMonth(novaData.getMonth() + 1);

      const { error } = await supabase
        .from('franquias')
        .update({
          status_pagamento: 'ativo',
          data_vencimento: novaData.toISOString().slice(0, 10),
        })
        .eq('id', franquia.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Franquia renovada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['franquias'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao renovar franquia');
    },
  });

  const handleToggleFranquiaStatus = async (franquia: Franquia) => {
    const novoStatus = franquia.status_pagamento === 'ativo' ? 'inadimplente' : 'ativo';

    const { error } = await supabase
      .from('franquias')
      .update({ status_pagamento: novoStatus })
      .eq('id', franquia.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      novoStatus === 'ativo'
        ? 'Franquia marcada como ativa'
        : 'Franquia marcada como inadimplente',
    );
    queryClient.invalidateQueries({ queryKey: ['franquias'] });
  };

  const handleDeleteFranquia = async (franquia: Franquia) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir a franquia "${franquia.nome_franquia}"? Todas as lojas, usuários e dados vinculados serão removidos.`,
      )
    ) {
      return;
    }

    try {
      // Buscar todas as lojas dessa franquia
      const { data: unidadesDaFranquia, error: unidadesError } = await supabase
        .from('unidades')
        .select('id')
        .eq('franquia_id', franquia.id);

      if (unidadesError) throw unidadesError;

      const unidadeIds = (unidadesDaFranquia || []).map((u) => u.id as string);

      // Remover vínculos de usuários com unidades e franquia
      const { error: userUnidadesError } = await supabase
        .from('user_unidades')
        .delete()
        .in('unidade_id', unidadeIds);
      if (userUnidadesError) throw userUnidadesError;

      const { error: systemUsersError } = await supabase
        .from('system_users')
        .delete()
        .eq('franquia_id', franquia.id);
      if (systemUsersError) throw systemUsersError;

      // Remover planos e bags por unidade
      if (unidadeIds.length > 0) {
        const { error: unidadePlanosError } = await supabase
          .from('unidade_planos')
          .delete()
          .in('unidade_id', unidadeIds);
        if (unidadePlanosError) throw unidadePlanosError;

        const { error: unidadeBagsError } = await supabase
          .from('unidade_bag_tipos')
          .delete()
          .in('unidade_id', unidadeIds);
        if (unidadeBagsError) throw unidadeBagsError;

        const { error: historicoError } = await supabase
          .from('historico_entregas')
          .delete()
          .in('unidade_id', unidadeIds);
        if (historicoError) throw historicoError;

        const { error: entregadoresError } = await supabase
          .from('entregadores')
          .delete()
          .in('unidade_id', unidadeIds);
        if (entregadoresError) throw entregadoresError;

        const { error: unidadesDeleteError } = await supabase
          .from('unidades')
          .delete()
          .in('id', unidadeIds);
        if (unidadesDeleteError) throw unidadesDeleteError;
      }

      // Remover configs de bag e logs da franquia
      const { error: franquiaBagsError } = await supabase
        .from('franquia_bag_tipos')
        .delete()
        .eq('franquia_id', franquia.id);
      if (franquiaBagsError) throw franquiaBagsError;

      const { error: logsError } = await supabase
        .from('logs_auditoria')
        .delete()
        .eq('franquia_id', franquia.id);
      if (logsError) throw logsError;

      // Finalmente, remover a franquia
      const { error: franquiaError } = await supabase
        .from('franquias')
        .delete()
        .eq('id', franquia.id);
      if (franquiaError) throw franquiaError;

      toast.success('Franquia excluída com sucesso');
      queryClient.invalidateQueries({ queryKey: ['franquias'] });
      queryClient.invalidateQueries({ queryKey: ['unidades-resumo'] });
      queryClient.invalidateQueries({ queryKey: ['unidade-planos'] });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao excluir franquia');
    }
  };

  const handleFranquiaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertFranquiaMutation.mutate();
  };
  const upsertPlanoMutation = useMutation({
    mutationFn: async () => {
      const nome = planoForm.nome.trim();
      if (!nome) throw new Error('Nome do plano é obrigatório');

      const valor = Number(planoForm.valor_base.replace(',', '.'));
      if (Number.isNaN(valor) || valor <= 0) throw new Error('Valor base inválido');

      const duracao = Number(planoForm.duracao_meses.replace(',', '.'));
      if (Number.isNaN(duracao) || duracao <= 0) throw new Error('Duração em meses inválida');

      const payload = {
        nome,
        tipo: planoForm.tipo,
        valor_base: valor,
        descricao: planoForm.descricao.trim() || null,
        duracao_meses: duracao,
        ativo: planoForm.ativo,
      };

      if (editingPlano) {
        const { error } = await supabase.from('planos').update(payload).eq('id', editingPlano.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('planos').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Plano salvo com sucesso');
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      setIsPlanoDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar plano');
    },
  });

  const handleDeletePlano = async (planoId: string) => {
    if (!confirm('Excluir este plano? Ele será removido de todas as lojas.')) return;

    // Remove vínculos com lojas primeiro
    const { error: upError } = await supabase
      .from('unidade_planos')
      .delete()
      .eq('plano_id', planoId);
    if (upError) {
      toast.error(upError.message);
      return;
    }

    const { error } = await supabase.from('planos').delete().eq('id', planoId);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Plano excluído com sucesso');
    queryClient.invalidateQueries({ queryKey: ['planos'] });
    queryClient.invalidateQueries({ queryKey: ['unidade-planos'] });
  };

  const handlePlanoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertPlanoMutation.mutate();
  };

  const upsertUnidadePlanoMutation = useMutation({
    mutationFn: async () => {
      const { unidadeId, planoId, valor, desconto } = selectedPlanoUnidade;
      if (!unidadeId || !planoId) throw new Error('Selecione loja e plano');

      const valorNum = Number(valor.replace(',', '.'));
      const descNum = desconto ? Number(desconto.replace(',', '.')) : 0;
      if (Number.isNaN(valorNum) || valorNum <= 0) throw new Error('Valor inválido');
      if (Number.isNaN(descNum) || descNum < 0) throw new Error('Desconto inválido');

      const existing = unidadesPlanos.find(
        (up) => up.unidade_id === unidadeId && up.plano_id === planoId
      );

      const payload = {
        unidade_id: unidadeId,
        plano_id: planoId,
        valor: valorNum,
        desconto_percent: descNum,
        ativo: true,
      };

      if (existing) {
        const { error } = await supabase
          .from('unidade_planos')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('unidade_planos').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Plano aplicado à loja com sucesso');
      queryClient.invalidateQueries({ queryKey: ['unidade-planos'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao aplicar plano');
    },
  });

  return (
    <Layout>
      <div className="space-y-8">
        <header className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-mono font-bold">Painel Super Admin</h1>
            <p className="text-sm text-muted-foreground">
              Gestão central do sistema, franquias, lojas, usuários e financeiro.
            </p>
          </div>
        </header>

        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="franquias">Franquias</TabsTrigger>
            <TabsTrigger value="lojas">Lojas</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="planos">Planos</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          </TabsList>

          {/* Aba Geral */}
          <TabsContent value="geral" className="space-y-6">
            {/* Acesso rápido */}
            <Card className="border-dashed border-border/70">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Store className="w-4 h-4" /> Acesso rápido às lojas
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Escolha entre o painel administrativo master ou entrar em qualquer loja como super admin.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <Input
                    placeholder="Buscar loja ou franquia"
                    value={quickAccessSearch}
                    onChange={(e) => setQuickAccessSearch(e.target.value)}
                    className="w-full sm:w-64"
                  />
                  <Select
                    value={selectedAdminUnit}
                    onValueChange={(value) => setSelectedAdminUnit(value)}
                  >
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder="Selecionar visão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MASTER">Painel Administrativo Master</SelectItem>
                      {quickAccessUnits.map((u) => {
                        const franquia = franquias.find((f) => f.id === u.franquia_id);
                        const label = franquia
                          ? `${franquia.nome_franquia} / ${u.nome_loja}`
                          : u.nome_loja;
                        return (
                          <SelectItem key={u.id} value={u.nome_loja}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedAdminUnit('MASTER');
                        navigate('/admin');
                      }}
                    >
                      Painel master
                    </Button>
                    <Button
                      type="button"
                      disabled={selectedAdminUnit === 'MASTER'}
                      onClick={() => {
                        if (selectedAdminUnit === 'MASTER') return;
                        setSelectedUnit(selectedAdminUnit as any);
                        navigate('/roteirista');
                      }}
                    >
                      Entrar na loja
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Resumo rápido */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Franquias</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono font-bold">{totalFranquias}</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Lojas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono font-bold">{totalLojas}</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono font-bold">{totalUsuarios}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba Franquias */}
          <TabsContent value="franquias" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-mono font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5" /> Franquias
              </h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  placeholder="Filtrar por nome ou slug"
                  value={searchFranquia}
                  onChange={(e) => setSearchFranquia(e.target.value)}
                  className="w-full sm:w-72"
                />
                <Button size="sm" className="gap-2" onClick={openNewFranquiaDialog}>
                  <Plus className="w-4 h-4" /> Nova franquia
                </Button>
              </div>
            </div>

            {isLoadingFranquias ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFranquias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma franquia encontrado.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredFranquias.map((f) => {
                  const lojasDaFranquia = unidades.filter((u) => u.franquia_id === f.id);
                  const nomesLojas = lojasDaFranquia.map((u) => u.nome_loja).join(', ');
                  return (
                    <Card key={f.id} className="border-border">
                      <CardHeader className="flex flex-row items-start justify-between gap-2">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base">
                            {f.nome_franquia}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">slug: {f.slug}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => renovarFranquiaMutation.mutate(f)}
                            title="Renovar manualmente"
                          >
                            Renovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleFranquiaStatus(f)}
                            title="Alternar status de pagamento"
                          >
                            {f.status_pagamento === 'ativo' ? 'Inadimplente' : 'Ativar'}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openEditFranquiaDialog(f)}
                            title="Editar franquia"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleDeleteFranquia(f)}
                            title="Excluir franquia e todos os dados vinculados"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>
                          <span className="font-medium">Lojas:</span> {lojasDaFranquia.length}
                          {f.plano_limite_lojas && ` / ${f.plano_limite_lojas}`}
                        </p>
                        {lojasDaFranquia.length > 0 && (
                          <p className="text-xs text-muted-foreground" title={nomesLojas}>
                            {nomesLojas.length > 80 ? `${nomesLojas.slice(0, 77)}...` : nomesLojas}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Status pagamento:</span>{' '}
                          {f.status_pagamento || 'não definido'}
                        </p>
                        <p>
                          <span className="font-medium">Vencimento:</span>{' '}
                          {f.data_vencimento
                            ? new Date(f.data_vencimento).toLocaleDateString('pt-BR')
                            : 'não definido'}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Aba Lojas */}
          <TabsContent value="lojas" className="space-y-4">
            <h2 className="text-lg font-mono font-semibold flex items-center gap-2">
              <Store className="w-5 h-5" /> Todas as lojas por franquia
            </h2>
            {unidades.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma loja cadastrada.</p>
            ) : (
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Loja</th>
                      <th className="px-4 py-2 text-left font-medium">Franquia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unidades.map((u) => {
                      const franquia = franquias.find((f) => f.id === u.franquia_id);
                      return (
                        <tr key={u.id} className="border-t border-border/60">
                          <td className="px-4 py-2">{u.nome_loja}</td>
                          <td className="px-4 py-2">
                            {franquia ? franquia.nome_franquia : 'Sem franquia'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Aba Usuários */}
          <TabsContent value="usuarios">
            <UsersManagement />
          </TabsContent>

          {/* Aba Planos */}
          <TabsContent value="planos" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-mono font-semibold flex items-center gap-2">
                <Store className="w-5 h-5" /> Planos de assinatura
              </h2>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditingPlano(null);
                  setPlanoForm({ nome: '', tipo: 'mensal', valor_base: '0', descricao: '', duracao_meses: '1', ativo: true });
                  setIsPlanoDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4" /> Novo plano
              </Button>
            </div>

            <PlanosModulosSection />

            {planos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum plano cadastrado ainda.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {planos.map((p) => {
                  const lojasComPlano = unidadesPlanos.filter(
                    (up) => up.plano_id === p.id && up.ativo
                  ).length;
                  return (
                    <Card key={p.id} className="border-border">
                      <CardHeader className="flex flex-row items-start justify-between gap-2">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base">
                            {p.nome}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {p.tipo === 'mensal' ? 'Mensal' : 'Anual'} • {p.duracao_meses} mês(es) • R$ {Number(p.valor_base ?? 0).toFixed(2)}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {p.ativo ? 'Plano ativo' : 'Plano inativo'} • Ativo em {lojasComPlano} loja(s)
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            title={p.ativo ? 'Desativar plano' : 'Reativar plano'}
                            onClick={async () => {
                              const { error } = await supabase
                                .from('planos')
                                .update({ ativo: !p.ativo })
                                .eq('id', p.id);
                              if (error) {
                                toast.error(error.message);
                              } else {
                                toast.success(p.ativo ? 'Plano desativado' : 'Plano reativado');
                                queryClient.invalidateQueries({ queryKey: ['planos'] });
                              }
                            }}
                          >
                            {p.ativo ? 'Off' : 'On'}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            title="Editar plano"
                            onClick={() => {
                              setEditingPlano(p);
                              setPlanoForm({
                                nome: p.nome,
                                tipo: p.tipo,
                                valor_base: String(p.valor_base),
                                descricao: p.descricao || '',
                                duracao_meses: String((p as any).duracao_meses ?? 1),
                                ativo: (p as any).ativo ?? true,
                              });
                              setIsPlanoDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            title="Excluir plano"
                            onClick={() => handleDeletePlano(p.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      {p.descricao && (
                        <CardContent>
                          <p className="text-xs text-muted-foreground">{p.descricao}</p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Aplicar plano por loja */}
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  Aplicar plano por loja
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Loja</Label>
                  <Select
                    value={selectedPlanoUnidade.unidadeId}
                    onValueChange={(v) => setSelectedPlanoUnidade((prev) => ({ ...prev, unidadeId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a loja" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => {
                        const franquia = franquias.find((f) => f.id === u.franquia_id);
                        const label = franquia
                          ? `${franquia.nome_franquia} / ${u.nome_loja}`
                          : u.nome_loja;
                        return (
                          <SelectItem key={u.id} value={u.id}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select
                    value={selectedPlanoUnidade.planoId}
                    onValueChange={(v) => setSelectedPlanoUnidade((prev) => ({ ...prev, planoId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {planos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome} ({p.tipo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor e desconto</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="text"
                      placeholder="Valor"
                      value={selectedPlanoUnidade.valor}
                      onChange={(e) =>
                        setSelectedPlanoUnidade((prev) => ({ ...prev, valor: e.target.value }))
                      }
                    />
                    <Input
                      type="text"
                      placeholder="% Desconto"
                      value={selectedPlanoUnidade.desconto}
                      onChange={(e) =>
                        setSelectedPlanoUnidade((prev) => ({ ...prev, desconto: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2"
                    onClick={() => upsertUnidadePlanoMutation.mutate()}
                    disabled={upsertUnidadePlanoMutation.isPending}
                  >
                    {upsertUnidadePlanoMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Aplicar plano à loja
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Financeiro */}
          <TabsContent value="financeiro" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Franquias ativas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-mono font-bold">
                    {franquias.filter((f) => f.status_pagamento === 'ativo').length}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Franquias inadimplentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-mono font-bold text-destructive">
                    {franquias.filter((f) => f.status_pagamento === 'inadimplente').length}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Lojas com plano aplicado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-mono font-bold">
                    {unidadesPlanos.filter((up) => up.ativo).length}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Faturamento mensal estimado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-mono font-bold">
                    R$
                    {Number(
                      franquiasFinanceiro.reduce((acc, f) => acc + (f.faturamentoEstimado ?? 0), 0)
                    ).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Faturamento por franquia</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  {franquiasFinanceiro.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-8 text-center">
                      Nenhum dado de faturamento disponível ainda.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={franquiasFinanceiro}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `R$ ${v}`} tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: any) => [
                            `R$ ${Number((value as number | string | null) ?? 0).toFixed(2)}`,
                            'Faturamento',
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="faturamentoEstimado" fill="hsl(var(--primary))" name="Faturamento" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Resumo de cobranças por franquia</CardTitle>
                </CardHeader>
                <CardContent className="max-h-64 overflow-auto">
                  {franquias.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma franquia cadastrada.</p>
                  ) : (
                    <table className="w-full text-xs md:text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Franquia</th>
                          <th className="px-3 py-2 text-left font-medium">Lojas</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                          <th className="px-3 py-2 text-left font-medium">Vencimento</th>
                          <th className="px-3 py-2 text-right font-medium">Faturamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {franquiasFinanceiro.map((f) => {
                          const franquiaMeta = franquias.find((fr) => fr.id === f.id);
                          const venc = franquiaMeta?.data_vencimento
                            ? new Date(franquiaMeta.data_vencimento)
                            : null;
                          const vencStr = venc
                            ? venc.toLocaleDateString('pt-BR')
                            : '—';
                          return (
                            <tr key={f.id} className="border-t border-border/60">
                              <td className="px-3 py-1.5">{f.nome}</td>
                              <td className="px-3 py-1.5">{f.lojas}</td>
                              <td className="px-3 py-1.5">
                                {franquiaMeta?.status_pagamento || '—'}
                              </td>
                              <td className="px-3 py-1.5">{vencStr}</td>
                              <td className="px-3 py-1.5 text-right">
                                R$ {Number(f.faturamentoEstimado ?? 0).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog de criação/edição de franquia */}
      <Dialog open={isFranquiaDialogOpen} onOpenChange={setIsFranquiaDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingFranquia ? 'Editar franquia' : 'Nova franquia'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="dados">
            <TabsList className="mb-4">
              <TabsTrigger value="dados">Dados da franquia</TabsTrigger>
              <TabsTrigger value="integracoes">Integrações & pagamento</TabsTrigger>
              <TabsTrigger value="modulos">Módulos da franquia</TabsTrigger>
              <TabsTrigger value="lojas" disabled={!editingFranquia}>
                Lojas da franquia
              </TabsTrigger>
              <TabsTrigger value="bags" disabled={!editingFranquia}>
                Tipos de BAG
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados">
              <form onSubmit={handleFranquiaSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da franquia</Label>
                  <Input
                    value={franquiaForm.nome_franquia}
                    onChange={(e) => setFranquiaForm({ ...franquiaForm, nome_franquia: e.target.value })}
                    placeholder="Ex: Dom Fiorentino"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={franquiaForm.slug}
                    onChange={(e) => setFranquiaForm({ ...franquiaForm, slug: e.target.value })}
                    placeholder="dom-fiorentino"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Limite de lojas</Label>
                    <Input
                      type="number"
                      min={1}
                      value={franquiaForm.plano_limite_lojas}
                      onChange={(e) =>
                        setFranquiaForm({
                          ...franquiaForm,
                          plano_limite_lojas: Number(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status pagamento</Label>
                    <Select
                      value={franquiaForm.status_pagamento}
                      onValueChange={(v) => setFranquiaForm({ ...franquiaForm, status_pagamento: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inadimplente">Inadimplente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data de vencimento</Label>
                  <Input
                    type="date"
                    value={franquiaForm.data_vencimento}
                    onChange={(e) =>
                      setFranquiaForm({
                        ...franquiaForm,
                        data_vencimento: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Plano do cliente</Label>
                    <Select
                      value={franquiaForm.plano_id}
                      onValueChange={(v) =>
                        setFranquiaForm({
                          ...franquiaForm,
                          plano_id: v === '__none__' ? '' : v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um plano (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem plano vinculado</SelectItem>
                        {planos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome} ({p.tipo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor mensal negociado</Label>
                    <Input
                      type="text"
                      placeholder="Ex: 199,90"
                      value={franquiaForm.valor_plano}
                      onChange={(e) =>
                        setFranquiaForm({
                          ...franquiaForm,
                          valor_plano: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Responsáveis (admins da franquia)</Label>
                  <Select
                    value={franquiaForm.admin_user_ids[0] || ''}
                    onValueChange={(v) =>
                      setFranquiaForm({
                        ...franquiaForm,
                        admin_user_ids: v ? [v] : [],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o usuário admin principal" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter((u) => !u.franquia_id || u.franquia_id === editingFranquia?.id)
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.username} ({u.role})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Este usuário será o admin da franquia e terá acesso multi-loja.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsFranquiaDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={upsertFranquiaMutation.isPending}
                  >
                    {upsertFranquiaMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Salvar
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="integracoes" className="space-y-4">
              <div className="space-y-2">
                <Label>Gateway de pagamento</Label>
                <Select
                  value={franquiaForm.provider}
                  onValueChange={(v) => setFranquiaForm({ ...franquiaForm, provider: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asas">Asaas</SelectItem>
                    <SelectItem value="seabra">Seabra</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key (não publique)</Label>
                <Input
                  type="password"
                  value={franquiaForm.api_key}
                  onChange={(e) => setFranquiaForm({ ...franquiaForm, api_key: e.target.value })}
                  placeholder="Chave da API do gateway"
                />
              </div>

              <div className="space-y-2">
                <Label>Webhook de cobrança (URL do seu backend)</Label>
                <p className="text-xs text-muted-foreground">
                  Opcional. Use quando tiver uma URL do seu backend para receber notificações automáticas
                  do gateway (pagamento confirmado, vencido, etc). Se não tiver, pode deixar em branco.
                </p>
                <Input
                  value={franquiaForm.webhook_url}
                  onChange={(e) => setFranquiaForm({ ...franquiaForm, webhook_url: e.target.value })}
                  placeholder="Opcional — ex.: https://seudominio.com/webhook-cobranca"
                />
              </div>

              <Separator className="my-2" />

              <div className="space-y-2">
                <Label>Instância Evolution (opcional)</Label>
                <Input
                  value={franquiaForm.evolution_instance}
                  onChange={(e) =>
                    setFranquiaForm({ ...franquiaForm, evolution_instance: e.target.value })
                  }
                  placeholder="Identificador da instância Evolution"
                />
              </div>

              <div className="space-y-2">
                <Label>URL da Evolution (WhatsApp)</Label>
                <Input
                  value={franquiaForm.evolution_url}
                  onChange={(e) => setFranquiaForm({ ...franquiaForm, evolution_url: e.target.value })}
                  placeholder="https://evolution-api.com"
                />
              </div>

              <div className="space-y-2">
                <Label>API Key da Evolution (WhatsApp)</Label>
                <Input
                  type="password"
                  value={franquiaForm.evolution_api_key}
                  onChange={(e) =>
                    setFranquiaForm({ ...franquiaForm, evolution_api_key: e.target.value })
                  }
                  placeholder="Chave da API da Evolution"
                />
              </div>
            </TabsContent>

            <TabsContent value="modulos" className="space-y-4">
              {!editingFranquia ? (
                <p className="text-sm text-muted-foreground">
                  Salve a franquia primeiro para gerenciar os módulos.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Ative ou desative os módulos disponíveis para todas as lojas desta
                    franquia.
                  </p>
                  <div className="space-y-2">
                    {modulosGlobais.map((m) => {
                      const ativo = franquiaForm.modulos_ativos.includes(m.codigo);
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between border border-border rounded-lg px-4 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">{m.nome}</p>
                            <p className="text-xs text-muted-foreground">Código: {m.codigo}</p>
                          </div>
                          <Switch
                            checked={ativo}
                            onCheckedChange={(checked) => {
                              setFranquiaForm((prev) => ({
                                ...prev,
                                modulos_ativos: checked
                                  ? [...prev.modulos_ativos, m.codigo]
                                  : prev.modulos_ativos.filter((c) => c !== m.codigo),
                              }));
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="lojas" className="space-y-4">
              {!editingFranquia ? (
                <p className="text-sm text-muted-foreground">
                  Salve a franquia primeiro para gerenciar as lojas.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-mono font-semibold">Lojas da franquia</h3>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => openNewLojaForFranquia(editingFranquia.id)}
                    >
                      <Plus className="w-4 h-4" /> Nova loja
                    </Button>
                  </div>

                  {unidades.filter((u) => u.franquia_id === editingFranquia.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma loja vinculada ainda.</p>
                  ) : (
                    <div className="overflow-x-auto border border-border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">Loja</th>
                            <th className="px-4 py-2 text-left font-medium">Usuário responsável</th>
                            <th className="px-4 py-2 text-right font-medium">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unidades
                            .filter((u) => u.franquia_id === editingFranquia.id)
                            .map((u) => {
                              const responsibleUser = users.find((usr) => usr.unidade_id === u.id);
                              return (
                                <tr key={u.id} className="border-t border-border/60">
                                  <td className="px-4 py-2">{u.nome_loja}</td>
                                  <td className="px-4 py-2">
                                    {responsibleUser ? responsibleUser.username : 'Nenhum'}
                                  </td>
                                  <td className="px-4 py-2 text-right space-x-2">
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() => openEditLojaDialog(u)}
                                      title="Editar loja"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                      onClick={() => deleteLoja(u)}
                                      title="Excluir loja"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="bags" className="space-y-4">
              {!editingFranquia ? null : <FranquiaBagsSection franquiaId={editingFranquia.id} />}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog de criação/edição de plano */}
      <Dialog open={isPlanoDialogOpen} onOpenChange={setIsPlanoDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingPlano ? 'Editar plano' : 'Novo plano'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePlanoSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do plano</Label>
              <Input
                value={planoForm.nome}
                onChange={(e) => setPlanoForm({ ...planoForm, nome: e.target.value })}
                placeholder="Ex: Plano Mensal"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={planoForm.tipo}
                  onValueChange={(v: 'mensal' | 'anual') =>
                    setPlanoForm({ ...planoForm, tipo: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duração (meses)</Label>
                <Input
                  type="number"
                  min={1}
                  value={planoForm.duracao_meses}
                  onChange={(e) =>
                    setPlanoForm({ ...planoForm, duracao_meses: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valor base (R$)</Label>
              <Input
                type="text"
                placeholder="Ex: 199,90"
                value={planoForm.valor_base}
                onChange={(e) =>
                  setPlanoForm({ ...planoForm, valor_base: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={planoForm.descricao}
                onChange={(e) =>
                  setPlanoForm({ ...planoForm, descricao: e.target.value })
                }
                placeholder="Detalhes do plano, limitações, etc."
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Plano ativo</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPlanoForm({ ...planoForm, ativo: !planoForm.ativo })}
              >
                {planoForm.ativo ? 'Ativo' : 'Inativo'}
              </Button>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsPlanoDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={upsertPlanoMutation.isPending}
              >
                {upsertPlanoMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Salvar plano
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de criação/edição de loja */}
      <Dialog open={isLojaDialogOpen} onOpenChange={setIsLojaDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingLoja ? 'Editar loja' : 'Nova loja'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const nome = lojaForm.nome_loja.trim();
              if (!nome) {
                toast.error('Nome da loja é obrigatório');
                return;
              }
              if (!lojaForm.franquia_id) {
                toast.error('Selecione uma franquia');
                return;
              }

              // Upsert da loja
              let lojaId = editingLoja?.id;
              const lojaPayload = {
                nome_loja: nome,
                franquia_id: lojaForm.franquia_id,
              };

              if (editingLoja) {
                const { error } = await supabase
                  .from('unidades')
                  .update(lojaPayload)
                  .eq('id', editingLoja.id);
                if (error) {
                  toast.error(error.message);
                  return;
                }
              } else {
                const { data, error } = await supabase
                  .from('unidades')
                  .insert([lojaPayload])
                  .select('id')
                  .maybeSingle();
                if (error) {
                  toast.error(error.message);
                  return;
                }
                lojaId = data?.id;
              }

              // Vincular usuário, se selecionado
              if (lojaForm.user_id && lojaForm.user_id !== 'none' && lojaId) {
                const { error: userError } = await supabase
                  .from('system_users')
                  .update({
                    unidade_id: lojaId,
                    franquia_id: lojaForm.franquia_id,
                  })
                  .eq('id', lojaForm.user_id);

                if (userError) {
                  toast.error(userError.message);
                  return;
                }
              }

              toast.success('Loja salva com sucesso');
              setIsLojaDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['unidades-resumo'] });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Nome da loja</Label>
              <Input
                value={lojaForm.nome_loja}
                onChange={(e) => setLojaForm({ ...lojaForm, nome_loja: e.target.value })}
                placeholder="Ex: Itaquaquecetuba"
              />
            </div>
            <div className="space-y-2">
              <Label>Franquia</Label>
              <Select
                value={lojaForm.franquia_id}
                onValueChange={(v) => setLojaForm({ ...lojaForm, franquia_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a franquia" />
                </SelectTrigger>
                <SelectContent>
                  {franquias.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome_franquia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Usuário responsável (opcional)</Label>
              <Select
                value={lojaForm.user_id}
                onValueChange={(v) => setLojaForm({ ...lojaForm, user_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {users.map((usr) => (
                    <SelectItem key={usr.id} value={usr.id}>
                      {usr.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsLojaDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Salvar loja
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}


