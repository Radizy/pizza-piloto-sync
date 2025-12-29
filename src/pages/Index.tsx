import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const navigate = useNavigate();
  const { setSelectedUnit } = useUnit();
  const { login } = useAuth();
 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modeDialogOpen, setModeDialogOpen] = useState(false);

  const displayName = 'DeliveryOS';

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
 
    if (!username.trim() || !password.trim()) {
      toast.error('Informe login e senha.');
      return;
    }
 
    setIsSubmitting(true);
    const loggedUser = await login(username, password);
    setIsSubmitting(false);
 
    if (!loggedUser) {
      toast.error('Login inválido. Verifique usuário e senha.');
      return;
    }
 
    // Garante que a unidade selecionada siga a unidade do usuário logado
    setSelectedUnit(loggedUser.unidade);
 
    toast.success('Login realizado com sucesso.');
 
    if (loggedUser.role === 'super_admin') {
      navigate('/admin');
      return;
    }

    // Se for admin de franquia e a franquia estiver bloqueada, vai direto para o Financeiro
    if (loggedUser.role === 'admin_franquia' && loggedUser.franquiaId) {
      const { data, error } = await supabase
        .from('franquias')
        .select('status_pagamento')
        .eq('id', loggedUser.franquiaId)
        .maybeSingle();

      if (!error && data && data.status_pagamento && ['inadimplente', 'inativo'].includes(data.status_pagamento)) {
        navigate('/config?tab=financeiro&bloqueio=1');
        return;
      }
    }
 
    setModeDialogOpen(true);
  };
  const goToRoteirista = () => {
    setModeDialogOpen(false);
    navigate('/roteirista');
  };

  const goToTv = () => {
    setModeDialogOpen(false);
    navigate('/tv');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-lg p-8 space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-2xl font-mono font-bold">{displayName}</h1>
          <p className="text-sm text-muted-foreground">
            Acesse o sistema com seu usuário e senha.
          </p>
        </header>

        <section className="space-y-6">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Lock className="w-4 h-4" /> Login de despacho
              </Label>
              <div className="grid grid-cols-1 gap-3">
                <Input
                  placeholder="Usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
                <Input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 text-base font-mono flex items-center justify-center gap-2"
            >
              {isSubmitting && <Users className="w-4 h-4 animate-spin" />}
              <span>Entrar</span>
            </Button>
          </form>
        </section>

        <footer className="flex items-center justify-between text-xs text-muted-foreground">
          <span>DeliveryOS • Acesso restrito</span>
          <Link to="/meu-lugar" className="hover:underline">
            Sou motoboy
          </Link>
        </footer>
      </div>

      <Dialog open={modeDialogOpen} onOpenChange={setModeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">Escolha o modo de trabalho</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <Button
              type="button"
              onClick={goToRoteirista}
              className="h-20 text-lg font-mono flex flex-col items-center justify-center gap-1"
            >
              <Users className="w-6 h-6" />
              <span>Roteirizador</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={goToTv}
              className="h-20 text-lg font-mono flex flex-col items-center justify-center gap-1"
            >
              <span>Modo TV</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}