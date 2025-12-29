import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Store } from 'lucide-react';

export function WebhookConfig() {
  const { selectedUnit } = useUnit();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [nomeLoja, setNomeLoja] = useState('');

  // Config da unidade (Google Sheets)
  const { data: config, isLoading } = useQuery({
    queryKey: ['system-config', selectedUnit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('unidade', selectedUnit)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!selectedUnit,
  });

  useEffect(() => {
    if ((config as any)?.nome_loja) {
      setNomeLoja((config as any).nome_loja);
    } else {
      setNomeLoja('');
    }
  }, [config]);

  // Save config unidade (apenas nome da loja)
  const saveMutation = useMutation({
    mutationFn: async ({ loja }: { loja: string }) => {
      if (config) {
        const { error } = await supabase
          .from('system_config')
          .update({ nome_loja: loja } as any)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_config')
          .insert({ unidade: selectedUnit, nome_loja: loja } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Nome da loja salvo com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao salvar nome da loja');
    },
  });

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

    return (
      <div className="space-y-6">
        {/* Nome da Loja */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold font-mono">Nome da Loja</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome-loja">Nome personalizado para esta unidade</Label>
            <div className="flex gap-2">
              <Input
                id="nome-loja"
                value={nomeLoja}
                onChange={(e) => setNomeLoja(e.target.value)}
                placeholder="Ex: Dom Fiorentino Itaquá"
                className="flex-1"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Este nome será exibido na tela da TV para esta unidade.
            </p>
          </div>
        </div>

      {/* Webhook Config */}
      <div className="flex items-center gap-3">
        <Webhook className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold font-mono">Webhook Google Sheets</h2>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="webhook-url">URL do Webhook (Google Apps Script)</Label>
          <div className="flex gap-2">
            <Input
              id="webhook-url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/..."
              className="flex-1"
            />
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Cole a URL do seu Google Apps Script para exportar os dados automaticamente.
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Código do Apps Script</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyScript} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
          <Textarea
            value={APPS_SCRIPT_CODE}
            readOnly
            className="font-mono text-xs h-64 bg-secondary/50"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Cole este código no Google Apps Script e publique como Web App.
          </p>
        </div>

        <div className="bg-secondary/50 rounded-lg p-4 text-sm">
          <p className="font-medium mb-2">Payload enviado:</p>
          <pre className="text-xs text-muted-foreground overflow-x-auto">
{`{
  "nome": "Nome do entregador",
  "horario_saida": "2024-12-25 19:30:00",
  "quantidade_entregas": "3",
  "motoboy": "João",
  "bag": "normal",
  "possui_bebida": "SIM",
  "unidade": "ITAQUA"
}`}
          </pre>
        </div>
      </div>

      {/* Configuração de WhatsApp por franquia */}
      {user?.franquiaId && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Webhook className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold font-mono">WhatsApp (Evolution) da franquia</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>URL da Evolution</Label>
              <Input
                value={whatsUrl}
                onChange={(e) => setWhatsUrl(e.target.value)}
                placeholder="https://seu-endereco-evolution.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Instância</Label>
              <Input
                value={whatsInstance}
                onChange={(e) => setWhatsInstance(e.target.value)}
                placeholder="Nome da instância"
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={whatsApiKey}
                onChange={(e) => setWhatsApiKey(e.target.value)}
                placeholder="Chave da API da Evolution"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveWhatsapp} disabled={saveWhatsappMutation.isPending}>
              {saveWhatsappMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Salvar configurações de WhatsApp
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
