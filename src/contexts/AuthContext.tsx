import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Unidade } from '@/lib/api';
 
interface User {
  id: string;
  username: string;
  // Papel derivado a partir dos campos da tabela system_users
  role: 'super_admin' | 'admin_franquia' | 'operador';
  unidade: Unidade;
  franquiaId: string | null;
  unidadeId: string | null;
  availableUnits?: Array<{ id: string; nome_loja: string; unidade_nome: Unidade }>;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, unidade?: Unidade) => Promise<User | null>;
  logout: () => void;
  changeUnit: (unidade: Unidade) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'fila_auth_session';

interface StoredSession extends User {
  loggedAt: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredSession;
        const loggedAt = new Date(parsed.loggedAt);
        const now = new Date();

        // Calcula último corte diário às 05:00
        const cutoff = new Date(now);
        cutoff.setHours(5, 0, 0, 0);
        if (now < cutoff) {
          // Antes das 05:00, considera o corte de hoje como o dia anterior
          cutoff.setDate(cutoff.getDate() - 1);
        }

        if (loggedAt < cutoff) {
          // Sessão anterior ao último corte: força novo login
          localStorage.removeItem(AUTH_STORAGE_KEY);
        } else {
          setUser(parsed as unknown as User);
        }
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string, unidade?: Unidade): Promise<User | null> => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (!trimmedUsername || !trimmedPassword) return null;
 
    const { data, error } = await supabase
      .from('system_users')
      .select('id, username, role, password_hash, unidade, franquia_id, unidade_id')
      .eq('username', trimmedUsername)
      .single();
 
    if (error || !data) {
      return null;
    }
 
    // Verificar senha (comparação simples - em produção usar bcrypt)
    if (data.password_hash !== trimmedPassword) {
      return null;
    }
 
    // Validar unidade, se fornecida
    if (unidade && data.unidade !== unidade) {
      return null;
    }
 
    // Mapear papel efetivo a partir dos campos brutos
    let effectiveRole: User['role'];
    if (data.role === 'admin') {
      // Admin global (sem franquia) ou Admin de franquia
      effectiveRole = (data as any).franquia_id ? 'admin_franquia' : 'super_admin';
    } else {
      // Usuários comuns são operadores vinculados a uma unidade
      effectiveRole = 'operador';
    }
 
    const userData: User = {
      id: data.id,
      username: data.username,
      role: effectiveRole,
      unidade: data.unidade as Unidade,
      franquiaId: (data as any).franquia_id ?? null,
      unidadeId: (data as any).unidade_id ?? null,
    };

    // Buscar unidades disponíveis para o usuário
    if ((data as any).franquia_id) {
      const { data: userUnits, error: unitsError } = await supabase
        .from('user_unidades')
        .select('unidade_id, unidades!inner(id, nome_loja)')
        .eq('user_id', data.id);

      if (!unitsError && userUnits && userUnits.length > 0) {
        userData.availableUnits = userUnits.map((uu: any) => ({
          id: uu.unidades.id,
          nome_loja: uu.unidades.nome_loja,
          unidade_nome: data.unidade as Unidade, // mantém compatibilidade
        }));
      }
    }
 
    setUser(userData);
    const stored: StoredSession = { ...(userData as any), loggedAt: new Date().toISOString() };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
    return userData;
  };

  const changeUnit = async (newUnidade: Unidade) => {
    if (!user) return;

    // Verificar se o usuário tem acesso a esta unidade
    const hasAccess = user.availableUnits?.some(
      (u) => u.nome_loja === newUnidade || u.unidade_nome === newUnidade
    );

    if (!hasAccess && user.role !== 'super_admin') {
      throw new Error('Você não tem acesso a esta unidade');
    }

    const updatedUser = { ...user, unidade: newUnidade };
    setUser(updatedUser);
    const stored: StoredSession = { ...(updatedUser as any), loggedAt: new Date().toISOString() };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };
 
  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, changeUnit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
