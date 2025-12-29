import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { MessageSquare, Plus, Save, Trash2 } from 'lucide-react';

interface WhatsAppTemplate {
  id: string;
  unidade_id: string;
  codigo: string;
  titulo: string;
  mensagem: string;
  ativo: boolean;
}

const TEMPLATE_CODES = [
  { codigo: 'chamada_entrega', label: 'Chamada para Entrega', placeholder: 'Olá {{nome}}! É sua vez. Pegue a {{bag}}.' },
  { codigo: 'chamada_pagamento', label: 'Chamada para Pagamento', placeholder: 'Olá {{nome}}! Compareça ao balcão para pagamento.' },
  { codigo: 'aviso_operacional', label: 'Aviso Operacional', placeholder: 'Atenção {{nome}}: {{mensagem}}' },
];

export function WhatsAppTemplates() {
  const { selectedUnit } = useUnit();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  // Resolver unidade_id real para admins de franquia multi-loja
  const resolvedUnitId = (() => {
    if (user?.unidadeId) return user.unidadeId;
    if (!selectedUnit || !user?.availableUnits) return null;
    const match = user.availableUnits.find(
      (u) => u.unidade_nome === selectedUnit || u.nome_loja === selectedUnit,
    );
    return match?.id ?? null;
  })();

  const unidadeInfoLabel = (() => {
    if (!resolvedUnitId) return 'Nenhuma loja vinculada selecionada.';
    const match = user?.availableUnits?.find((u) => u.id === resolvedUnitId);
    return match ? `${match.nome_loja}` : undefined;
  })();

  // Buscar templates da unidade
  const { data: templates = [], isLoading } = useQuery<WhatsAppTemplate[]>({
    queryKey: ['whatsapp-templates', resolvedUnitId],
    queryFn: async () => {
      if (!resolvedUnitId) return [];
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('unidade_id', resolvedUnitId)
        .order('created_at');
      if (error) throw error;
      return data || [];
    },
    enabled: !!resolvedUnitId,
  });

  // Mutation para salvar template
  const saveMutation = useMutation({
    mutationFn: async ({ codigo, titulo, mensagem }: { codigo: string; titulo: string; mensagem: string }) => {
      if (!resolvedUnitId) throw new Error('Selecione uma loja/unidade primeiro');

      const existing = templates.find((t) => t.codigo === codigo);

      if (existing) {
        const { error } = await supabase
          .from('whatsapp_templates')
          .update({ titulo, mensagem })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('whatsapp_templates').insert({
          unidade_id: resolvedUnitId,
          codigo,
          titulo,
          mensagem,
          ativo: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template salvo com sucesso!');
      setEditingTemplate(null);
    },
    onError: () => {
      toast.error('Erro ao salvar template');
    },
  });

  // Mutation para deletar template
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template removido');
    },
    onError: () => {
      toast.error('Erro ao remover template');
    },
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const codigo = formData.get('codigo') as string;
    const titulo = formData.get('titulo') as string;
    const mensagem = formData.get('mensagem') as string;

    if (!codigo || !titulo || !mensagem) {
      toast.error('Preencha todos os campos');
      return;
    }

    saveMutation.mutate({ codigo, titulo, mensagem });
  };

  const getTemplate = (codigo: string) => templates.find((t) => t.codigo === codigo);

  if (!resolvedUnitId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Templates WhatsApp
          </CardTitle>
          <CardDescription>
            Selecione uma loja para configurar os templates de WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Entre em uma loja pelo painel ou vincule este usuário à(s) lojas para liberar a
            configuração.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Templates WhatsApp
        </CardTitle>
        <CardDescription>
          Configure mensagens personalizadas para diferentes situações nesta loja.
          Use <code>{'{{nome}}'}</code>, <code>{'{{bag}}'}</code>, <code>{'{{mensagem}}'}</code>,
          <code>{'{{senha}}'}</code> como variáveis.{' '}
          {unidadeInfoLabel && (
            <span className="block text-xs text-muted-foreground mt-1">
              Loja selecionada: <strong>{unidadeInfoLabel}</strong>
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-muted-foreground">Carregando templates...</p>
        ) : (
          TEMPLATE_CODES.map((templateDef) => {
            const existing = getTemplate(templateDef.codigo);
            const isEditing = editingTemplate === templateDef.codigo;

            return (
              <div key={templateDef.codigo} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{templateDef.label}</h3>
                  {existing && !isEditing && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTemplate(templateDef.codigo)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(existing.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  {!existing && !isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTemplate(templateDef.codigo)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleSave} className="space-y-4">
                    <input type="hidden" name="codigo" value={templateDef.codigo} />
                    <div className="space-y-2">
                      <Label htmlFor={`titulo-${templateDef.codigo}`}>Título</Label>
                      <Input
                        id={`titulo-${templateDef.codigo}`}
                        name="titulo"
                        defaultValue={existing?.titulo || ''}
                        placeholder={templateDef.label}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`mensagem-${templateDef.codigo}`}>Mensagem</Label>
                      <Textarea
                        id={`mensagem-${templateDef.codigo}`}
                        name="mensagem"
                        defaultValue={existing?.mensagem || ''}
                        placeholder={templateDef.placeholder}
                        rows={4}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saveMutation.isPending}>
                        <Save className="w-4 h-4 mr-2" />
                        {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingTemplate(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : existing ? (
                  <div className="bg-secondary/50 rounded p-3 text-sm">
                    <p className="font-medium mb-1">{existing.titulo}</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{existing.mensagem}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum template configurado</p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

