import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
}

interface FranquiaStatus {
  id: string;
  nome_franquia: string;
  status_pagamento: string | null;
}

interface BlockedOperadorScreenProps {
  franquia?: FranquiaStatus | null;
  logout: () => void;
}

function BlockedOperadorScreen({ franquia, logout }: BlockedOperadorScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      logout();
    }, 5000);

    return () => clearTimeout(timer);
  }, [logout]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 space-y-4 text-center">
        <h1 className="text-lg font-mono font-semibold">Acesso bloqueado temporariamente</h1>
        <p className="text-sm text-muted-foreground">
          A franquia
          {franquia?.nome_franquia ? ` "${franquia.nome_franquia}" ` : ' desta loja '}
          está com pendências financeiras. Você será desconectado automaticamente em alguns segundos.
        </p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading: isAuthLoading, logout } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Verificando sessão...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const { data: franquia, isLoading } = useQuery<FranquiaStatus | null>({
    queryKey: ['franquia-status', user?.franquiaId],
    enabled: !!user?.franquiaId && user.role !== 'super_admin',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franquias')
        .select('id, nome_franquia, status_pagamento')
        .eq('id', user!.franquiaId)
        .maybeSingle();
      if (error) throw error;
      return data as FranquiaStatus | null;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Carregando dados da franquia...
      </div>
    );
  }

  const isFranquiaBlocked = !!franquia?.status_pagamento &&
    ['inadimplente', 'inativo'].includes(franquia.status_pagamento);

  const isFranquiaAdmin = user?.role === 'admin_franquia';
  const isOperador = user?.role === 'operador';

  // Admin de franquia inadimplente: bloqueia apenas Roteirista e TV, liberando Config/Webhook/Financeiro
  if (isFranquiaBlocked && isFranquiaAdmin && (location.pathname === '/roteirista' || location.pathname === '/tv')) {
    return <Navigate to="/config?tab=financeiro&bloqueio=1" replace />;
  }

  // Operador com franquia bloqueada: mostrar aviso e deslogar em até 5 segundos
  if (isFranquiaBlocked && isOperador) {
    return <BlockedOperadorScreen franquia={franquia} logout={logout} />;
  }

  return <>{children}</>;
}

