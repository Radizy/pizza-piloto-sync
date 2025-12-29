import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Unidade } from '@/lib/api';
import { UnitSelector } from './UnitSelector';
import { Settings, Users, Tv, UserCheck, Pizza, ArrowLeft, LogOut, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { UnitSwitcher } from './UnitSwitcher';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

const navItems = [
  { path: '/config', label: 'Configuração', icon: Settings },
  { path: '/roteirista', label: 'Roteirista', icon: Users },
  { path: '/fila-pagamento', label: 'Pagamento', icon: Ticket },
  { path: '/tv', label: 'TV', icon: Tv },
  { path: '/checkin', label: 'Check-in', icon: UserCheck },
];

export function Layout({ children, showHeader = true }: LayoutProps) {
  const location = useLocation();
  const { selectedUnit, setSelectedUnit } = useUnit();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const canChangeUnit = user?.role === 'super_admin' || user?.role === 'admin_franquia';

  // Não mostrar logout em rotas específicas
  const hideLogout = location.pathname === '/tv' || location.pathname === '/checkin';

  const handleChangeUnit = (unit: Unidade) => {
    if (user?.role === 'super_admin') {
      setSelectedUnit(unit);
      return;
    }

    if (user?.role === 'admin_franquia') {
      setSelectedUnit(unit);
      return;
    }

    if (user?.role === 'operador' && user.unidade && user.unidade !== unit) {
      toast.error('Você só pode acessar a sua própria unidade.');
      return;
    }

    setSelectedUnit(unit);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logout realizado com sucesso');
  };
 
  if (!showHeader) {
    return <>{children}</>;
  }
 
  const isAdminRoute = location.pathname === '/admin';
 
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Pizza className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-mono font-bold text-lg">DeliveryOS</span>
            </Link>
 
          </div>
 
          {selectedUnit && !isAdminRoute && (
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                        'hover:bg-secondary',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              
              {/* Seletor de unidade multiloja */}
              <UnitSwitcher />
              
              {!hideLogout && (
                <>
                  <span className="text-border">|</span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Sair</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>
 
      <main className="container py-8 animate-fade-in">{children}</main>
    </div>
  );
}

export function BackButton() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Voltar ao início</span>
    </Link>
  );
}
