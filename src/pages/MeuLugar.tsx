import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMotoboyPosition, Unidade } from '@/lib/api';
import { Pizza, User, Loader2, Search, Truck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

export default function MeuLugar() {
  const [telefone, setTelefone] = useState('');
  const [searchTelefone, setSearchTelefone] = useState('');

  // Heartbeat: atualização automática a cada 5 minutos
  const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutos

  const { data: positionData, isLoading, isError, refetch } = useQuery({
    queryKey: ['motoboy-position', searchTelefone],
    queryFn: () => getMotoboyPosition(searchTelefone),
    enabled: searchTelefone.length >= 10,
    refetchInterval: 10000, // Atualiza a cada 10 segundos
  });

  // Heartbeat: força refetch a cada 5 minutos
  useEffect(() => {
    if (!searchTelefone) return;

    const interval = setInterval(() => {
      refetch();
      console.log('Heartbeat: atualizando posição...');
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [searchTelefone, refetch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (telefone.length >= 10) {
      setSearchTelefone(telefone);
    }
  };

  const renderResult = () => {
    if (!searchTelefone) return null;

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (isError || !positionData || !positionData.nome) {
      return (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl text-muted-foreground">Motoboy não encontrado</p>
          <p className="text-sm text-muted-foreground mt-2">
            Verifique o telefone e a unidade
          </p>
        </div>
      );
    }

    // Status não é disponível
    if (positionData.status === 'chamado') {
      return (
        <div className="text-center py-12 bg-accent rounded-xl animate-pulse">
          <Clock className="w-20 h-20 mx-auto mb-4 text-accent-foreground" />
          <h2 className="text-4xl font-bold font-mono text-accent-foreground mb-2">
            {positionData.nome}
          </h2>
          <p className="text-2xl text-accent-foreground">
            🔔 VOCÊ FOI CHAMADO!
          </p>
          <p className="text-lg text-accent-foreground/80 mt-4">
            Dirija-se ao balcão imediatamente
          </p>
        </div>
      );
    }

    if (positionData.status === 'entregando') {
      return (
        <div className="text-center py-12 bg-status-delivering/20 border border-status-delivering rounded-xl">
          <Truck className="w-20 h-20 mx-auto mb-4 text-status-delivering" />
          <h2 className="text-3xl font-bold font-mono mb-2">{positionData.nome}</h2>
          <p className="text-xl text-muted-foreground">Você está em entrega</p>
          <p className="text-sm text-muted-foreground mt-4">
            Retorne após finalizar para voltar à fila
          </p>
        </div>
      );
    }

    // Disponível na fila
    if (positionData.position) {
      return (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <div className="w-32 h-32 rounded-full bg-primary mx-auto mb-6 flex items-center justify-center">
            <span className="text-6xl font-bold font-mono text-primary-foreground">
              {positionData.position}
            </span>
          </div>
          <h2 className="text-3xl font-bold font-mono mb-2">{positionData.nome}</h2>
          <p className="text-xl text-muted-foreground">
            Você está na posição <strong>{positionData.position}</strong> da fila
          </p>
          {positionData.position === 1 && (
            <p className="text-lg text-primary mt-4 font-semibold">
              🎉 Você é o próximo!
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-12 bg-card border border-border rounded-xl">
        <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">{positionData.nome}</h2>
        <p className="text-muted-foreground">
          Você não está na fila no momento
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Verifique seu turno e dias de trabalho
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Logo sem link */}
      <header className="border-b border-border bg-card/50">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Pizza className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-mono font-bold text-lg">Fila Dom Fiorentino</span>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-mono mb-2">Meu Lugar na Fila</h1>
          <p className="text-muted-foreground">
            Consulte sua posição atual na fila de entregas
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4 mb-8">
          {/* Apenas telefone - unidade é detectada automaticamente pelo sistema */}
          <div className="space-y-2">
            <Label htmlFor="telefone">Seu telefone (com DDD)</Label>
            <Input
              id="telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))}
              placeholder="11999999999"
              className="text-lg h-12"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg gap-2"
            disabled={telefone.length < 10}
          >
            <Search className="w-5 h-5" />
            Consultar
          </Button>
        </form>

        {/* Result */}
        {renderResult()}

        {searchTelefone && !isLoading && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            Atualização automática a cada 10 segundos
          </p>
        )}
      </div>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}
