import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Package, Sparkles, Webhook, Copy, Check, Phone, FileCode, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTTS } from '@/hooks/useTTS';

interface Modulo {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
}

export function ModulosConfig() {
  const { user } = useAuth();
  const { selectedUnit } = useUnit();
  const queryClient = useQueryClient();

  // Buscar módulos globais
  const { data: modulos = [], isLoading: loadingModulos } = useQuery<Modulo[]>({
    queryKey: ['modulos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modulos')
        .select('id, codigo, nome, descricao')
        .eq('ativo', true);
      if (error) throw error;
      return data as Modulo[];
    },
  });

  // Buscar módulos ativos da franquia
  const { data: franquia, isLoading: loadingFranquia } = useQuery({
    queryKey: ['franquia-modulos', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return null;
      const { data, error } = await supabase
        .from('franquias')
        .select('config_pagamento')
        .eq('id', user.franquiaId)
        .maybeSingle();
      if (error) throw error;
      return data as { config_pagamento: any } | null;
    },
    enabled: !!user?.franquiaId,
  });

  const modulosAtivos = (franquia?.config_pagamento as any)?.modulos_ativos || [];

  const tvPrompts = (franquia?.config_pagamento as any)?.tv_prompts || {
    entrega_chamada: 'É a sua vez {nome}',
    entrega_bag: 'Pegue a {bag}',
    pagamento_chamada:
      'Olá {nome}, sua senha é {senha}. Dirija-se ao caixa da {unidade} para receber.',
  };

  const tvTtsConfig = (franquia?.config_pagamento as any)?.tv_tts || {
    enabled: true,
    volume: 100,
    voice_model: 'system',
  };

  const whatsappConfig = (franquia?.config_pagamento as any)?.whatsapp || null;

  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [whatsUrl, setWhatsUrl] = useState(whatsappConfig?.url || '');
  const [whatsApiKey, setWhatsApiKey] = useState(whatsappConfig?.api_key || '');
  const [whatsInstance, setWhatsInstance] = useState(whatsappConfig?.instance || '');

  const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Nome da aba: Unidade-DD/MM
    var hoje = new Date();
    var dataFormatada = Utilities.formatDate(hoje, "America/Sao_Paulo", "dd/MM");
    var nomeAba = data.unidade + "-" + dataFormatada;
    
    // Verificar se a aba existe, senão criar
    var sheet = ss.getSheetByName(nomeAba);
    if (!sheet) {
      sheet = ss.insertSheet(nomeAba);
      // Adicionar cabeçalhos
      sheet.appendRow([
        "Horário Saída",
        "Motoboy",
        "Qtd. Entregas",
        "Tipo BAG",
        "Possui Bebida",
        "Registrado em"
      ]);
      // Formatar cabeçalhos
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold");
    }
    
    // Adicionar nova linha
    sheet.appendRow([
      data.horario_saida,
      data.motoboy,
      data.quantidade_entregas,
      data.bag,
      data.possui_bebida || "NAO",
      new Date()
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const savePromptsMutation = useMutation({
    mutationFn: async (payload: { entrega_chamada: string; entrega_bag: string; pagamento_chamada: string }) => {
      if (!user?.franquiaId) return;
      const currentConfig = (franquia?.config_pagamento as any) || {};
      const newConfig = {
        ...currentConfig,
        tv_prompts: payload,
      };

      const { error } = await supabase
        .from('franquias')
        .update({ config_pagamento: newConfig })
        .eq('id', user.franquiaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franquia-modulos', user?.franquiaId] });
      queryClient.invalidateQueries({ queryKey: ['franquia-config-tv', user?.franquiaId] });
      toast.success('Textos da TV atualizados para a franquia!');
    },
    onError: () => {
      toast.error('Erro ao salvar textos da TV');
    },
  });
  if (loadingModulos || loadingFranquia) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Módulos opcionais
        </CardTitle>
        <CardDescription>
          Visualize os módulos ativos para sua franquia e ajuste as mensagens do módulo de TV.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {modulos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum módulo opcional disponível no momento.
            </p>
          ) : (
            modulos.map((m) => {
              const ativo = modulosAtivos.includes(m.codigo);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between border border-border rounded-lg p-4"
                >
                  <div className="flex-1">
                    <Label className="font-semibold">{m.nome}</Label>
                    {m.descricao && (
                      <p className="text-xs text-muted-foreground mt-1">{m.descricao}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Código: {m.codigo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${ativo ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <Switch checked={ativo} disabled />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {user?.role === 'admin_franquia' && (
          <div className="mt-6 border-t border-border pt-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">
                  Textos da animação da TV (por franquia)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Use <code>{'{nome}'}</code> para o nome do motoboy, <code>{'{bag}'}</code> para o
                nome da bag, <code>{'{senha}'}</code> para o número da senha e <code>{'{unidade}'}</code>
                {' '}para o nome da loja.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tv-entrega-chamada">Frase de chamada de entrega (TV)</Label>
                  <Input
                    id="tv-entrega-chamada"
                    defaultValue={tvPrompts.entrega_chamada}
                    onBlur={(e) =>
                      savePromptsMutation.mutate({
                        entrega_chamada: e.target.value || tvPrompts.entrega_chamada,
                        entrega_bag: tvPrompts.entrega_bag,
                        pagamento_chamada: tvPrompts.pagamento_chamada,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tv-entrega-bag">Frase da bag (TV)</Label>
                  <Input
                    id="tv-entrega-bag"
                    defaultValue={tvPrompts.entrega_bag}
                    onBlur={(e) =>
                      savePromptsMutation.mutate({
                        entrega_chamada: tvPrompts.entrega_chamada,
                        entrega_bag: e.target.value || tvPrompts.entrega_bag,
                        pagamento_chamada: tvPrompts.pagamento_chamada,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tv-pagamento-chamada">
                  Frase de chamada para pagamento (WhatsApp/TV)
                </Label>
                <Input
                  id="tv-pagamento-chamada"
                  defaultValue={tvPrompts.pagamento_chamada}
                  onBlur={(e) =>
                    savePromptsMutation.mutate({
                      entrega_chamada: tvPrompts.entrega_chamada,
                      entrega_bag: tvPrompts.entrega_bag,
                      pagamento_chamada: e.target.value || tvPrompts.pagamento_chamada,
                    })
                  }
                />
              </div>

              {/* Configuração de voz da chamada (TTS) */}
              <TvTtsConfigSection
                franquiaId={user.franquiaId!}
                initialConfig={tvTtsConfig}
              />
            </div>

            {/* Integração Planilha (Google Sheets) */}
            {modulosAtivos.includes('integracao_planilha') && selectedUnit && (
              <div className="border-t border-border pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Integração com Planilha (Google Sheets)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cole a URL do seu Google Apps Script e use o código abaixo como base.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL do Webhook (Apps Script)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="webhook-url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/..."
                    />
                    <Button
                      type="button"
                      onClick={async () => {
                        // salvar na tabela system_config da unidade atual
                        const { data, error } = await supabase
                          .from('system_config')
                          .select('id')
                          .eq('unidade', selectedUnit)
                          .maybeSingle();

                        if (error && error.code !== 'PGRST116') {
                          toast.error('Erro ao salvar webhook');
                          return;
                        }

                        const upsertError = data
                          ? (await supabase
                              .from('system_config')
                              .update({ webhook_url: webhookUrl })
                              .eq('id', data.id)).error
                          : (await supabase
                              .from('system_config')
                              .insert({ unidade: selectedUnit, webhook_url: webhookUrl } as any)).error;

                        if (upsertError) {
                          toast.error('Erro ao salvar webhook');
                        } else {
                          toast.success('Webhook salvo com sucesso!');
                          queryClient.invalidateQueries({ queryKey: ['system-config', selectedUnit] });
                        }
                      }}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
                <div className="border border-dashed border-border rounded-lg p-4 space-y-3 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">Código base do Apps Script</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(APPS_SCRIPT_CODE);
                        setCopied(true);
                        toast.success('Código copiado!');
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="gap-2"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copiar código
                    </Button>
                  </div>
                  <Textarea
                    readOnly
                    value={APPS_SCRIPT_CODE}
                    className="font-mono text-xs h-40 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Configuração de WhatsApp (Evolution) */}
            {modulosAtivos.includes('whatsapp_evolution') && (
              <div className="border-t border-border pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">WhatsApp (Evolution) da franquia</span>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="whats-url">URL da API</Label>
                    <Input
                      id="whats-url"
                      value={whatsUrl}
                      onChange={(e) => setWhatsUrl(e.target.value)}
                      placeholder="https://api.seuwhats.com/instance/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whats-instance">Instância</Label>
                    <Input
                      id="whats-instance"
                      value={whatsInstance}
                      onChange={(e) => setWhatsInstance(e.target.value)}
                      placeholder="ID da instância"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whats-api-key">API Key</Label>
                    <Input
                      id="whats-api-key"
                      type="password"
                      value={whatsApiKey}
                      onChange={(e) => setWhatsApiKey(e.target.value)}
                      placeholder="Chave da API"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!user?.franquiaId) return;
                    const { data, error } = await supabase
                      .from('franquias')
                      .select('config_pagamento')
                      .eq('id', user.franquiaId)
                      .maybeSingle();
                    if (error) {
                      toast.error('Erro ao carregar configuração');
                      return;
                    }
                    const currentCfg = (data?.config_pagamento as any) || {};
                    const newCfg = {
                      ...currentCfg,
                      whatsapp:
                        whatsUrl && whatsApiKey && whatsInstance
                          ? { url: whatsUrl, api_key: whatsApiKey, instance: whatsInstance }
                          : null,
                    };
                    const { error: updateError } = await supabase
                      .from('franquias')
                      .update({ config_pagamento: newCfg })
                      .eq('id', user.franquiaId);
                    if (updateError) {
                      toast.error('Erro ao salvar configuração de WhatsApp');
                    } else {
                      toast.success('Configuração de WhatsApp salva com sucesso!');
                      queryClient.invalidateQueries({ queryKey: ['franquia-modulos', user.franquiaId] });
                    }
                  }}
                >
                  Salvar WhatsApp
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TvTtsConfigSectionProps {
  franquiaId: string;
  initialConfig: any;
}

function TvTtsConfigSection({ franquiaId, initialConfig }: TvTtsConfigSectionProps) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState<boolean>(initialConfig?.enabled ?? true);
  const [voiceModel, setVoiceModel] = useState<string>(initialConfig?.voice_model ?? 'system');
  const [volume, setVolume] = useState<number>(initialConfig?.volume ?? 100);
  const [testText, setTestText] = useState<string>('Senha 32, motoboy, é a sua vez de receber!');
  const { speak } = useTTS({
    enabled: true,
    volume,
    voice_model: voiceModel as any,
  });

  const saveTtsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('franquias')
        .select('config_pagamento')
        .eq('id', franquiaId)
        .maybeSingle();

      if (error) throw error;

      const currentCfg = (data?.config_pagamento as any) || {};
      const newCfg = {
        ...currentCfg,
        tv_tts: {
          enabled,
          volume,
          voice_model: voiceModel,
        },
      };

      const { error: updateError } = await supabase
        .from('franquias')
        .update({ config_pagamento: newCfg })
        .eq('id', franquiaId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success('Configuração de voz da TV salva com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['franquia-config-tv', franquiaId] });
    },
    onError: () => {
      toast.error('Erro ao salvar configuração de voz da TV');
    },
  });

  return (
    <div className="mt-6 border-t border-border pt-6 space-y-4">
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Voz da Chamada (TTS)</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Escolha o modelo de voz para as chamadas na TV. A alteração é aplicada automaticamente nas TVs
        conectadas. Todas as opções usam voz em português do Brasil e não geram custo adicional.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Ativar voz</Label>
          <div className="flex items-center gap-3">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-xs text-muted-foreground">
              Quando desativado, apenas a animação visual será exibida na TV.
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Modelo de voz</Label>
          <Select value={voiceModel} onValueChange={setVoiceModel}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o modelo de voz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">TTS atual do sistema (fallback)</SelectItem>
              <SelectItem value="browser_default">Browser — pt-BR (Padrão)</SelectItem>
              <SelectItem value="browser_clara">Browser — pt-BR (Clara)</SelectItem>
              <SelectItem value="browser_grave">Browser — pt-BR (Grave)</SelectItem>
              <SelectItem value="google_tts">Google Translate TTS — pt-BR</SelectItem>
              <SelectItem value="elevenlabs_voz_1">ElevenLabs — Voz BR 1 (mais suave)</SelectItem>
              <SelectItem value="elevenlabs_voz_2">ElevenLabs — Voz BR 2 (jovem)</SelectItem>
              <SelectItem value="elevenlabs_voz_3">ElevenLabs — Voz BR 3 (neutra)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-1">
            Navegador e Google são gratuitos. As opções ElevenLabs usam vozes humanas em pt-BR via sua
            conta ElevenLabs.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Volume</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[volume]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => setVolume(v)}
            className="flex-1"
          />
          <span className="w-10 text-xs text-right text-muted-foreground">{volume}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Texto para teste rápido</Label>
        <Input
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="Digite um texto curto para testar a voz"
        />
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => speak(testText || 'Senha 32, motoboy, é a sua vez de receber!')}
          >
            Testar voz
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => saveTtsMutation.mutate()}
            disabled={saveTtsMutation.isPending}
          >
            {saveTtsMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          A alteração é aplicada automaticamente nas TVs conectadas, sem precisar recarregar a tela.
        </p>
      </div>
    </div>
  );
}
