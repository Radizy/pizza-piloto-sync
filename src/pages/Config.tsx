import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Layout, BackButton } from '@/components/Layout';
import { EntregadorCard } from '@/components/EntregadorCard';
import { UsersManagement } from '@/components/UsersManagement';
import { WebhookConfig } from '@/components/WebhookConfig';
import { WhatsAppTemplates } from '@/components/WhatsAppTemplates';
import { BulkMotoboyImport } from '@/components/BulkMotoboyImport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModulosConfig } from '@/components/ModulosConfig';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fetchEntregadores,
  createEntregador,
  updateEntregador,
  deleteEntregador,
  Entregador,
  Unidade,
  DiasTrabalho,
  TURNO_PADRAO,
} from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Users, Loader2, LogOut, Filter } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router-dom';

const DIAS_SEMANA = [
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terça' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
] as const;

const DEFAULT_DIAS_TRABALHO: DiasTrabalho = {
  dom: true,
  seg: true,
  ter: true,
  qua: true,
  qui: true,
  sex: true,
  sab: true,
};

export default function Config() {
  const { selectedUnit } = useUnit();
  const { logout, user } = useAuth();
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const isPaymentBlocked = searchParams.get('bloqueio') === '1';
  const isFranquiaAdmin = user?.role === 'admin_franquia';
  const initialTab = isPaymentBlocked && isFranquiaAdmin ? 'financeiro' : 'motoboys';
  const [paymentBlockedOpen, setPaymentBlockedOpen] = useState(isPaymentBlocked && isFranquiaAdmin);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntregador, setEditingEntregador] = useState<Entregador | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    unidade: selectedUnit || ('ITAQUA' as Unidade),
    dias_trabalho: DEFAULT_DIAS_TRABALHO,
    usar_turno_padrao: true,
    turno_inicio: TURNO_PADRAO.inicio.slice(0, 5),
    turno_fim: TURNO_PADRAO.fim.slice(0, 5),
  });

  // Filtros
  const [filterStatus, setFilterStatus] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [filterTurno, setFilterTurno] = useState<'all' | 'padrao' | 'custom'>('all');

  // Redirect se não houver unidade selecionada, exceto quando o acesso estiver bloqueado
  // e o admin de franquia precisa entrar apenas no Financeiro
  if (!selectedUnit && !(isPaymentBlocked && isFranquiaAdmin)) {
    return <Navigate to="/" replace />;
  }

  // Query for fetching entregadores
  const { data: entregadores = [], isLoading } = useQuery({
    queryKey: ['entregadores', selectedUnit],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit }),
  });

  // Filtrar entregadores
  const filteredEntregadores = entregadores.filter((e) => {
    if (filterStatus === 'ativo' && !e.ativo) return false;
    if (filterStatus === 'inativo' && e.ativo) return false;
    if (filterTurno === 'padrao' && e.usar_turno_padrao === false) return false;
    if (filterTurno === 'custom' && e.usar_turno_padrao !== false) return false;
    return true;
  });

  // Mutation for creating entregador
  const createMutation = useMutation({
    mutationFn: createEntregador,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Entregador cadastrado com sucesso!');
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao cadastrar entregador');
    },
  });

  // Mutation for updating entregador
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Entregador> }) =>
      updateEntregador(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Entregador atualizado!');
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao atualizar entregador');
    },
  });

  // Mutation for deleting entregador
  const deleteMutation = useMutation({
    mutationFn: deleteEntregador,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Entregador removido!');
    },
    onError: () => {
      toast.error('Erro ao remover entregador');
    },
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      unidade: selectedUnit,
      dias_trabalho: DEFAULT_DIAS_TRABALHO,
      usar_turno_padrao: true,
      turno_inicio: TURNO_PADRAO.inicio.slice(0, 5),
      turno_fim: TURNO_PADRAO.fim.slice(0, 5),
    });
    setEditingEntregador(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim() || !formData.telefone.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    const turnoInicio = formData.turno_inicio + ':00';
    const turnoFim = formData.turno_fim + ':00';

    if (editingEntregador) {
      updateMutation.mutate({
        id: editingEntregador.id,
        data: {
          nome: formData.nome,
          telefone: formData.telefone,
          dias_trabalho: formData.dias_trabalho,
          usar_turno_padrao: formData.usar_turno_padrao,
          turno_inicio: turnoInicio,
          turno_fim: turnoFim,
        },
      });
    } else {
      createMutation.mutate({
        nome: formData.nome,
        telefone: formData.telefone,
        unidade: formData.unidade,
        status: 'disponivel',
        ativo: true,
        dias_trabalho: formData.dias_trabalho,
        usar_turno_padrao: formData.usar_turno_padrao,
        turno_inicio: turnoInicio,
        turno_fim: turnoFim,
      });
    }
  };

  const handleEdit = (entregador: Entregador) => {
    setEditingEntregador(entregador);
    setFormData({
      nome: entregador.nome,
      telefone: entregador.telefone,
      unidade: entregador.unidade,
      dias_trabalho: entregador.dias_trabalho || DEFAULT_DIAS_TRABALHO,
      usar_turno_padrao: entregador.usar_turno_padrao !== false,
      turno_inicio: entregador.turno_inicio?.slice(0, 5) || TURNO_PADRAO.inicio.slice(0, 5),
      turno_fim: entregador.turno_fim?.slice(0, 5) || TURNO_PADRAO.fim.slice(0, 5),
    });
    setIsFormOpen(true);
  };

  const handleToggleAtivo = (entregador: Entregador) => {
    const updateData: Partial<Entregador> = { ativo: !entregador.ativo };
    
    if (!entregador.ativo) {
      updateData.fila_posicao = new Date().toISOString();
    }
    
    updateMutation.mutate({
      id: entregador.id,
      data: updateData,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este entregador?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDiaChange = (dia: keyof DiasTrabalho, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      dias_trabalho: {
        ...prev.dias_trabalho,
        [dia]: checked,
      },
    }));
  };

  const activeCount = entregadores.filter((e) => e.ativo).length;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Logado como: <strong>{user?.username}</strong>
          </span>
          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold font-mono mb-2">Configuração</h1>
        <p className="text-muted-foreground">
          Gerencie os entregadores e configurações da unidade{' '}
          <span className="font-semibold text-foreground">{selectedUnit}</span>
        </p>
      </div>

      {isPaymentBlocked && isFranquiaAdmin && (
        <Dialog open={paymentBlockedOpen} onOpenChange={setPaymentBlockedOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-mono text-lg">Franquia bloqueada por pagamento</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Seu acesso ao sistema está temporariamente restrito devido à pendência de pagamento.
              Use a aba <span className="font-semibold">Financeiro</span> para regularizar a situação e
              liberar novamente todas as funcionalidades.
            </p>
          </DialogContent>
        </Dialog>
      )}

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className={`grid w-full ${user?.role === 'admin_franquia' ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="motoboys">Motoboys</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
          <TabsTrigger value="webhook">Integrações &amp; WhatsApp</TabsTrigger>
          {user?.role === 'admin_franquia' && (
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="motoboys" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Filtros */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="inativo">Inativos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterTurno} onValueChange={(v) => setFilterTurno(v as typeof filterTurno)}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos turnos</SelectItem>
                    <SelectItem value="padrao">Turno padrão</SelectItem>
                    <SelectItem value="custom">Turno custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => setIsFormOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Motoboy
            </Button>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total cadastrados</p>
                  <p className="text-2xl font-bold font-mono">{entregadores.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-status-available/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-status-available" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold font-mono">{activeCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <BulkMotoboyImport unidade={selectedUnit as Unidade} />
              {filteredEntregadores.length === 0 ? (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-lg">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    {entregadores.length === 0
                      ? 'Nenhum entregador cadastrado nesta unidade'
                      : 'Nenhum entregador encontrado com os filtros aplicados'}
                  </p>
                  <Button onClick={() => setIsFormOpen(true)} variant="outline">
                    Cadastrar motoboy
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredEntregadores.map((entregador) => (
                    <EntregadorCard
                      key={entregador.id}
                      entregador={entregador}
                      onEdit={() => handleEdit(entregador)}
                      onDelete={() => handleDelete(entregador.id)}
                      onToggleAtivo={() => handleToggleAtivo(entregador)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="usuarios">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="modulos">
          {/* Apenas visual: módulos ativos da franquia, incluindo Extra de Animação na TV */}
          <ModulosConfig />
        </TabsContent>

        <TabsContent value="webhook">
          <div className="space-y-6">
            <WebhookConfig />
            <WhatsAppTemplates />
          </div>
        </TabsContent>

        {user?.role === 'admin_franquia' && (
          <TabsContent value="financeiro" className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-mono font-semibold mb-2">Financeiro</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Renove sua franquia e acompanhe o histórico de renovações configurado pelo super admin.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="button">Abrir tela de pagamento</Button>
                <Button type="button" variant="outline">
                  Ver histórico de renovações
                </Button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingEntregador ? 'Editar Motoboy' : 'Novo Motoboy'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nome: e.target.value }))
                }
                placeholder="Nome do motoboy"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Celular (com DDD)</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, telefone: e.target.value }))
                }
                placeholder="11999999999"
              />
            </div>

            {!editingEntregador && user?.role === 'super_admin' && (
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Select
                  value={formData.unidade}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, unidade: value as Unidade }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ITAQUA">Itaquaquecetuba</SelectItem>
                    <SelectItem value="POA">Poá</SelectItem>
                    <SelectItem value="SUZANO">Suzano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dias de Trabalho */}
            <div className="space-y-3">
              <Label>Dias de Trabalho</Label>
              <div className="grid grid-cols-2 gap-2">
                {DIAS_SEMANA.map((dia) => (
                  <div key={dia.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dia-${dia.key}`}
                      checked={formData.dias_trabalho[dia.key]}
                      onCheckedChange={(checked) =>
                        handleDiaChange(dia.key, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`dia-${dia.key}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {dia.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Turno */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Turno</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="turno-padrao"
                    checked={formData.usar_turno_padrao}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, usar_turno_padrao: checked }))
                    }
                  />
                  <Label htmlFor="turno-padrao" className="text-sm font-normal cursor-pointer">
                    Turno padrão (16:00 - 02:00)
                  </Label>
                </div>
              </div>

              {!formData.usar_turno_padrao && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="turno-inicio">Início</Label>
                    <Input
                      id="turno-inicio"
                      type="time"
                      value={formData.turno_inicio}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, turno_inicio: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="turno-fim">Fim</Label>
                    <Input
                      id="turno-fim"
                      type="time"
                      value={formData.turno_fim}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, turno_fim: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingEntregador ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
