import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Users, Key } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';


type Papel = 'super_admin' | 'admin_franquia' | 'operador';

interface SystemUser {
  id: string;
  username: string;
  role: 'admin' | 'user'; // enum bruto da tabela
  franquia_id: string | null;
  unidade_id: string | null;
  created_at: string;
  // campos de relacionamento (opcionais)
  franquias?: { nome_franquia: string } | null;
  unidades?: { nome_loja: string } | null;
}

interface FormData {
  username: string;
  password: string;
  papel: Papel;
  franquiaId: string | null;
  unidadeId: string | null;
}

interface FranquiaOption {
  id: string;
  nome_franquia: string;
}

interface UnidadeOption {
  id: string;
  nome_loja: string;
  franquia_id: string;
}

export function UsersManagement() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    papel: 'operador',
    franquiaId: null,
    unidadeId: null,
  });
  const [newPassword, setNewPassword] = useState('');

  // Fetch franquias e unidades para vincular papéis
  const { data: franquias = [] } = useQuery<FranquiaOption[]>({
    queryKey: ['franquias-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franquias')
        .select('id, nome_franquia')
        .order('nome_franquia', { ascending: true });
      if (error) throw error;
      return data as FranquiaOption[];
    },
  });

  const { data: unidades = [] } = useQuery<UnidadeOption[]>({
    queryKey: ['unidades-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidades')
        .select('id, nome_loja, franquia_id')
        .order('nome_loja', { ascending: true });
      if (error) throw error;
      return data as UnidadeOption[];
    },
  });

  // Fetch users
  const { data: users = [], isLoading } = useQuery<SystemUser[]>({
    queryKey: ['system-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_users')
        .select('id, username, role, created_at, franquia_id, unidade_id')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as SystemUser[];
    },
  });

  // Create user
  const createMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      // Traduz o papel de alto nível para os campos da tabela
      let role: 'admin' | 'user' = 'user';
      let franquia_id: string | null = null;
      let unidade_id: string | null = null;

      if (payload.papel === 'super_admin') {
        role = 'admin';
      } else if (payload.papel === 'admin_franquia') {
        role = 'admin';
        franquia_id = payload.franquiaId;
      } else if (payload.papel === 'operador') {
        role = 'user';
        unidade_id = payload.unidadeId;
        // opcionalmente poderíamos preencher franquia_id a partir da unidade escolhida
        const unidade = unidades.find((u) => u.id === payload.unidadeId);
        if (unidade) {
          franquia_id = unidade.franquia_id;
        }
      }

      const { error } = await supabase.from('system_users').insert([
        {
          username: payload.username,
          password_hash: payload.password,
          role,
          franquia_id,
          unidade_id,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      toast.success('Usuário criado com sucesso!');
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao criar usuário');
    },
  });

  // Update user
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: FormData }) => {
      let role: 'admin' | 'user' = 'user';
      let franquia_id: string | null = null;
      let unidade_id: string | null = null;

      if (payload.papel === 'super_admin') {
        role = 'admin';
      } else if (payload.papel === 'admin_franquia') {
        role = 'admin';
        franquia_id = payload.franquiaId;
      } else if (payload.papel === 'operador') {
        role = 'user';
        unidade_id = payload.unidadeId;
        const unidade = unidades.find((u) => u.id === payload.unidadeId);
        if (unidade) {
          franquia_id = unidade.franquia_id;
        }
      }

      const { error } = await supabase
        .from('system_users')
        .update({ username: payload.username, role, franquia_id, unidade_id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      toast.success('Usuário atualizado!');
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao atualizar usuário');
    },
  });

  // Update password
  const updatePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const { error } = await supabase
        .from('system_users')
        .update({ password_hash: password })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      toast.success('Senha atualizada!');
      setIsPasswordOpen(false);
      setEditingUser(null);
      setNewPassword('');
    },
    onError: () => {
      toast.error('Erro ao atualizar senha');
    },
  });

  // Delete user
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('system_users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      toast.success('Usuário removido!');
    },
    onError: () => {
      toast.error('Erro ao remover usuário');
    },
  });

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      papel: 'operador',
      franquiaId: null,
      unidadeId: null,
    });
    setEditingUser(null);
    setIsFormOpen(false);
  };

  const unidadesPorFranquia = unidades.reduce<Record<string, UnidadeOption[]>>((acc, u) => {
    if (!acc[u.franquia_id]) acc[u.franquia_id] = [];
    acc[u.franquia_id].push(u);
    return acc;
  }, {});

  const unidadesFiltradas = formData.franquiaId
    ? unidadesPorFranquia[formData.franquiaId] || []
    : unidades;

  const availableFranquias: FranquiaOption[] = currentUser?.role === 'super_admin'
    ? franquias
    : currentUser?.franquiaId
      ? franquias.filter((f) => f.id === currentUser.franquiaId)
      : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      toast.error('Informe o nome de usuário');
      return;
    }

    if (formData.papel === 'super_admin' && currentUser?.role !== 'super_admin') {
      toast.error('Apenas super admins podem definir esse tipo de permissão');
      return;
    }

    if (formData.papel === 'admin_franquia' && !formData.franquiaId) {
      toast.error('Selecione a franquia para o Admin Franquia');
      return;
    }

    if (formData.papel === 'operador' && !formData.unidadeId) {
      toast.error('Selecione a unidade para o Operador');
      return;
    }

    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        payload: formData,
      });
    } else {
      if (!formData.password.trim()) {
        toast.error('Informe a senha');
        return;
      }
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (user: SystemUser) => {
    // Inferir papel a partir dos campos brutos
    let papel: Papel = 'operador';
    if (user.role === 'admin') {
      papel = user.franquia_id ? 'admin_franquia' : 'super_admin';
    } else {
      papel = 'operador';
    }

    const unidade = user.unidade_id ? unidades.find((u) => u.id === user.unidade_id) : undefined;
    const franquiaId = user.franquia_id ?? unidade?.franquia_id ?? null;

    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      papel,
      franquiaId,
      unidadeId: user.unidade_id,
    });
    setIsFormOpen(true);
  };

  const handleChangePassword = (user: SystemUser) => {
    setEditingUser(user);
    setNewPassword('');
    setIsPasswordOpen(true);
  };

  const handleDelete = (user: SystemUser) => {
    if (users.length <= 1) {
      toast.error('Não é possível excluir o único usuário');
      return;
    }
    if (confirm(`Excluir usuário "${user.username}"?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !editingUser) {
      toast.error('Informe a nova senha');
      return;
    }
    updatePasswordMutation.mutate({ id: editingUser.id, password: newPassword });
  };

  // Filtragem de usuários visíveis conforme papel do usuário logado
  const unidadeToFranquia = new Map(unidades.map((u) => [u.id, u.franquia_id]));

  const visibleUsers = users.filter((u) => {
    if (!currentUser) return false;
    const isSuperAdminRow = u.role === 'admin' && !u.franquia_id;

    const userFranquiaId =
      u.franquia_id ?? (u.unidade_id ? unidadeToFranquia.get(u.unidade_id) ?? null : null);

    if (currentUser.role === 'super_admin') {
      return true;
    }

    if (currentUser.role === 'admin_franquia') {
      if (isSuperAdminRow) return false;
      return userFranquiaId === currentUser.franquiaId;
    }

    if (currentUser.role === 'operador') {
      if (isSuperAdminRow) return false;
      return u.unidade_id === currentUser.unidadeId;
    }

    return false;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold font-mono">Usuários do Sistema</h2>
        </div>
        <Button onClick={() => setIsFormOpen(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : visibleUsers.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 bg-card border border-border rounded-lg p-4"
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <span className="font-bold font-mono text-lg">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold">{user.username}</p>
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    let papel: string;
                    if (user.role === 'admin') {
                      papel = user.franquia_id ? 'Admin Franquia' : 'Super Admin';
                    } else {
                      papel = 'Operador';
                    }

                    const franquiaNome = franquias.find((f) => f.id === user.franquia_id)?.nome_franquia;
                    const unidadeNome = unidades.find((u) => u.id === user.unidade_id)?.nome_loja;

                    if (papel === 'Super Admin') return 'Super Admin do sistema';
                    if (papel === 'Admin Franquia') {
                      return franquiaNome
                        ? `Admin da franquia ${franquiaNome}`
                        : 'Admin de franquia';
                    }
                    if (papel === 'Operador') {
                      return unidadeNome
                        ? `Operador da loja ${unidadeNome}`
                        : 'Operador';
                    }
                    return papel;
                  })()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleChangePassword(user)}
                  title="Alterar senha"
                >
                  <Key className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEdit(user)}
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(user)}
                  title="Excluir"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nome de usuário</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Digite o nome de usuário"
              />
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Digite a senha"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="papel">Permissão</Label>
              <Select
                value={formData.papel}
                onValueChange={(v) =>
                  setFormData({ ...formData, papel: v as Papel })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  {currentUser?.role === 'super_admin' && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                  <SelectItem value="admin_franquia">Admin Franquia</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.papel !== 'super_admin' && (
              <div className="space-y-2">
                <Label htmlFor="franquia">Franquia</Label>
                <Select
                  value={formData.franquiaId ?? ''}
                  onValueChange={(v) => {
                    if (currentUser?.role !== 'super_admin' && v !== currentUser?.franquiaId) {
                      toast.error('Você só pode selecionar a sua própria franquia');
                      return;
                    }
                    setFormData({ ...formData, franquiaId: v || null, unidadeId: null });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a franquia" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFranquias.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome_franquia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.papel === 'operador' && (
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade (loja)</Label>
                <Select
                  value={formData.unidadeId ?? ''}
                  onValueChange={(v) => {
                    const unidade = unidades.find((u) => u.id === v);
                    setFormData({
                      ...formData,
                      unidadeId: v || null,
                      franquiaId: unidade ? unidade.franquia_id : formData.franquiaId,
                    });
                  }}
                  disabled={!formData.franquiaId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      formData.franquiaId ? 'Selecione a unidade' : 'Selecione primeiro a franquia'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {unidadesFiltradas.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome_loja}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
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
                {editingUser ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">Alterar Senha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <p className="text-muted-foreground">
              Alterando senha do usuário: <strong>{editingUser?.username}</strong>
            </p>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={updatePasswordMutation.isPending}
              >
                {updatePasswordMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Alterar Senha
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
