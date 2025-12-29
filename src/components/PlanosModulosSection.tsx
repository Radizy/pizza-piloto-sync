import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Package, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface ModuloRow {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number | null;
  ativo: boolean | null;
}

interface PacoteRow {
  id: string;
  nome: string;
  codigo: string;
  descricao: string | null;
  preco_total: number;
  desconto_percent: number | null;
  plano_id: string | null;
  modulos_inclusos: string[] | null;
  ativo: boolean | null;
}

export function PlanosModulosSection() {
  const queryClient = useQueryClient();
  const [moduloForm, setModuloForm] = useState({
    id: '',
    nome: '',
    codigo: '',
    descricao: '',
    preco_mensal: '',
  });
  const [pacoteForm, setPacoteForm] = useState({
    id: '',
    nome: '',
    codigo: '',
    descricao: '',
    preco_total: '',
    desconto_percent: '',
    plano_id: '',
    modulos_inclusos: [] as string[],
  });

  const { data: planos = [] } = useQuery({
    queryKey: ['planos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos')
        .select('id, nome, tipo');
      if (error) throw error;
      return data as { id: string; nome: string; tipo: string }[];
    },
  });

  const { data: modulos = [], isLoading: loadingModulos } = useQuery<ModuloRow[]>({
    queryKey: ['modulos-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modulos')
        .select('id, codigo, nome, descricao, preco_mensal, ativo')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: pacotes = [], isLoading: loadingPacotes } = useQuery<PacoteRow[]>({
    queryKey: ['pacotes-comerciais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pacotes_comerciais')
        .select(
          'id, nome, codigo, descricao, preco_total, desconto_percent, plano_id, modulos_inclusos, ativo',
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        modulos_inclusos: (p.modulos_inclusos as any) || [],
      }));
    },
  });

  const upsertModuloMutation = useMutation({
    mutationFn: async () => {
      const nome = moduloForm.nome.trim();
      const codigo = moduloForm.codigo.trim();
      if (!nome || !codigo) throw new Error('Nome e código do módulo são obrigatórios');

      const preco = moduloForm.preco_mensal
        ? Number(moduloForm.preco_mensal.replace(',', '.'))
        : null;

      const payload = {
        nome,
        codigo,
        descricao: moduloForm.descricao.trim() || null,
        preco_mensal: preco,
        ativo: true,
      };

      if (moduloForm.id) {
        const { error } = await supabase
          .from('modulos')
          .update(payload)
          .eq('id', moduloForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('modulos').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Módulo salvo com sucesso');
      setModuloForm({ id: '', nome: '', codigo: '', descricao: '', preco_mensal: '' });
      queryClient.invalidateQueries({ queryKey: ['modulos-admin'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar módulo');
    },
  });

  const toggleModuloMutation = useMutation({
    mutationFn: async (modulo: ModuloRow) => {
      const { error } = await supabase
        .from('modulos')
        .update({ ativo: !modulo.ativo })
        .eq('id', modulo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modulos-admin'] });
    },
  });

  const upsertPacoteMutation = useMutation({
    mutationFn: async () => {
      const nome = pacoteForm.nome.trim();
      const codigo = pacoteForm.codigo.trim();
      if (!nome || !codigo) throw new Error('Nome e código do pacote são obrigatórios');

      const preco = Number(pacoteForm.preco_total.replace(',', '.'));
      if (Number.isNaN(preco) || preco <= 0) {
        throw new Error('Preço total inválido');
      }

      const desconto = pacoteForm.desconto_percent
        ? Number(pacoteForm.desconto_percent.replace(',', '.'))
        : null;

      const payload = {
        nome,
        codigo,
        descricao: pacoteForm.descricao.trim() || null,
        preco_total: preco,
        desconto_percent: desconto,
        plano_id: pacoteForm.plano_id || null,
        modulos_inclusos: pacoteForm.modulos_inclusos,
        ativo: true,
      };

      if (pacoteForm.id) {
        const { error } = await supabase
          .from('pacotes_comerciais')
          .update(payload)
          .eq('id', pacoteForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pacotes_comerciais').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Pacote comercial salvo com sucesso');
      setPacoteForm({
        id: '',
        nome: '',
        codigo: '',
        descricao: '',
        preco_total: '',
        desconto_percent: '',
        plano_id: '',
        modulos_inclusos: [],
      });
      queryClient.invalidateQueries({ queryKey: ['pacotes-comerciais'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar pacote');
    },
  });

  const deletePacoteMutation = useMutation({
    mutationFn: async (pacoteId: string) => {
      const { error } = await supabase
        .from('pacotes_comerciais')
        .delete()
        .eq('id', pacoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pacote removido');
      queryClient.invalidateQueries({ queryKey: ['pacotes-comerciais'] });
    },
  });

  const startEditModulo = (modulo: ModuloRow) => {
    setModuloForm({
      id: modulo.id,
      nome: modulo.nome,
      codigo: modulo.codigo,
      descricao: modulo.descricao || '',
      preco_mensal: modulo.preco_mensal != null ? String(modulo.preco_mensal) : '',
    });
  };

  const startEditPacote = (pacote: PacoteRow) => {
    setPacoteForm({
      id: pacote.id,
      nome: pacote.nome,
      codigo: pacote.codigo,
      descricao: pacote.descricao || '',
      preco_total: String(pacote.preco_total),
      desconto_percent:
        pacote.desconto_percent != null ? String(pacote.desconto_percent) : '',
      plano_id: pacote.plano_id || '',
      modulos_inclusos: pacote.modulos_inclusos || [],
    });
  };

  const handleModuloSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertModuloMutation.mutate();
  };

  const handlePacoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertPacoteMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Planos, módulos e pacotes
          </CardTitle>
          <CardDescription>
            Gerencie os módulos opcionais do sistema e crie pacotes comerciais combinando
            módulos e planos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Módulos opcionais (globais) */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Módulos opcionais</h3>
            <form
              onSubmit={handleModuloSubmit}
              className="grid gap-4 md:grid-cols-4 items-end border border-border rounded-lg p-4"
            >
              <div className="space-y-2">
                <Label>Nome do módulo</Label>
                <Input
                  value={moduloForm.nome}
                  onChange={(e) => setModuloForm({ ...moduloForm, nome: e.target.value })}
                  placeholder="Ex: WhatsApp avançado"
                />
              </div>
              <div className="space-y-2">
                <Label>Código interno</Label>
                <Input
                  value={moduloForm.codigo}
                  onChange={(e) =>
                    setModuloForm({ ...moduloForm, codigo: e.target.value.toLowerCase() })
                  }
                  placeholder="ex: whatsapp_avancado"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor mensal sugerido (R$)</Label>
                <Input
                  value={moduloForm.preco_mensal}
                  onChange={(e) =>
                    setModuloForm({ ...moduloForm, preco_mensal: e.target.value })
                  }
                  placeholder="Ex: 29,90"
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label>Descrição (opcional)</Label>
                <Input
                  value={moduloForm.descricao}
                  onChange={(e) =>
                    setModuloForm({ ...moduloForm, descricao: e.target.value })
                  }
                  placeholder="Resumo para uso comercial"
                />
              </div>
              <div className="md:col-span-4 flex justify-end">
                <Button type="submit" disabled={upsertModuloMutation.isPending}>
                  {upsertModuloMutation.isPending
                    ? 'Salvando módulo...'
                    : moduloForm.id
                      ? 'Atualizar módulo'
                      : 'Adicionar módulo'}
                </Button>
              </div>
            </form>

            {loadingModulos ? (
              <p className="text-sm text-muted-foreground">Carregando módulos...</p>
            ) : modulos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum módulo cadastrado ainda. Use o formulário acima para criar.
              </p>
            ) : (
              <div className="space-y-2">
                {modulos.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between border border-border rounded-lg px-4 py-2 text-sm"
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => startEditModulo(m)}
                    >
                      <p className="font-medium">{m.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Código: {m.codigo} • Valor sugerido: R${' '}
                        {m.preco_mensal != null ? m.preco_mensal.toFixed(2) : '0,00'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {m.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      <Switch
                        checked={!!m.ativo}
                        onCheckedChange={() => toggleModuloMutation.mutate(m)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Pacotes comerciais */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pacotes comerciais
            </h3>

            <form
              onSubmit={handlePacoteSubmit}
              className="grid gap-4 md:grid-cols-4 border border-border rounded-lg p-4"
            >
              <div className="space-y-2">
                <Label>Nome do pacote</Label>
                <Input
                  value={pacoteForm.nome}
                  onChange={(e) => setPacoteForm({ ...pacoteForm, nome: e.target.value })}
                  placeholder="Ex: Combo Premium"
                />
              </div>
              <div className="space-y-2">
                <Label>Código interno</Label>
                <Input
                  value={pacoteForm.codigo}
                  onChange={(e) =>
                    setPacoteForm({ ...pacoteForm, codigo: e.target.value.toLowerCase() })
                  }
                  placeholder="ex: premium_01"
                />
              </div>
              <div className="space-y-2">
                <Label>Preço total (R$)</Label>
                <Input
                  value={pacoteForm.preco_total}
                  onChange={(e) =>
                    setPacoteForm({ ...pacoteForm, preco_total: e.target.value })
                  }
                  placeholder="Ex: 199,90"
                />
              </div>
              <div className="space-y-2">
                <Label>Desconto % (opcional)</Label>
                <Input
                  value={pacoteForm.desconto_percent}
                  onChange={(e) =>
                    setPacoteForm({ ...pacoteForm, desconto_percent: e.target.value })
                  }
                  placeholder="Ex: 10"
                />
              </div>

              <div className="space-y-2">
                <Label>Plano base (opcional)</Label>
                <Select
                  value={pacoteForm.plano_id}
                  onValueChange={(v) => setPacoteForm({ ...pacoteForm, plano_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem plano vinculado</SelectItem>
                    {planos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} ({p.tipo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Módulos inclusos</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {modulos.map((m) => {
                    const checked = pacoteForm.modulos_inclusos.includes(m.codigo);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={`rounded border px-2 py-1 text-left transition-colors ${
                          checked
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card border-border hover:bg-muted'
                        }`}
                        onClick={() => {
                          setPacoteForm((prev) => ({
                            ...prev,
                            modulos_inclusos: checked
                              ? prev.modulos_inclusos.filter((c) => c !== m.codigo)
                              : [...prev.modulos_inclusos, m.codigo],
                          }));
                        }}
                      >
                        {m.nome}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 md:col-span-4">
                <Label>Descrição comercial (opcional)</Label>
                <Input
                  value={pacoteForm.descricao}
                  onChange={(e) =>
                    setPacoteForm({ ...pacoteForm, descricao: e.target.value })
                  }
                  placeholder="Texto usado na proposta comercial"
                />
              </div>

              <div className="md:col-span-4 flex justify-end gap-2">
                {pacoteForm.id && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setPacoteForm({
                        id: '',
                        nome: '',
                        codigo: '',
                        descricao: '',
                        preco_total: '',
                        desconto_percent: '',
                        plano_id: '',
                        modulos_inclusos: [],
                      })
                    }
                  >
                    Cancelar edição
                  </Button>
                )}
                <Button type="submit" disabled={upsertPacoteMutation.isPending}>
                  {upsertPacoteMutation.isPending
                    ? 'Salvando pacote...'
                    : pacoteForm.id
                      ? 'Atualizar pacote'
                      : 'Criar pacote'}
                </Button>
              </div>
            </form>

            {loadingPacotes ? (
              <p className="text-sm text-muted-foreground">Carregando pacotes...</p>
            ) : pacotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum pacote cadastrado. Use o formulário acima para criar combinações de
                módulos.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pacotes.map((p) => {
                  const planoNome = planos.find((pl) => pl.id === p.plano_id)?.nome;
                  return (
                    <Card key={p.id} className="border-border">
                      <CardHeader className="flex flex-row items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {p.nome}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">Código: {p.codigo}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            R$ {p.preco_total.toFixed(2)}{' '}
                            {p.desconto_percent
                              ? `• Desconto ${p.desconto_percent}%`
                              : null}
                          </p>
                          {planoNome && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Plano base: {planoNome}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditPacote(p)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => deletePacoteMutation.mutate(p.id)}
                          >
                            Remover
                          </Button>
                        </div>
                      </CardHeader>
                      {p.modulos_inclusos && p.modulos_inclusos.length > 0 && (
                        <CardContent>
                          <p className="text-xs text-muted-foreground mb-1">
                            Módulos inclusos:
                          </p>
                          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                            {p.modulos_inclusos.map((codigo) => {
                              const modulo = modulos.find((m) => m.codigo === codigo);
                              return (
                                <li key={codigo}>{modulo ? modulo.nome : codigo}</li>
                              );
                            })}
                          </ul>
                          {p.descricao && (
                            <p className="text-xs text-muted-foreground mt-2">{p.descricao}</p>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
