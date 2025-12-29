import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pizza, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    
    try {
      const loggedUser = await login(username, password);
      
      if (loggedUser) {
        toast.success('Login realizado com sucesso!');
        navigate(loggedUser.role === 'super_admin' ? '/admin' : '/roteirista');
      } else {
        toast.error('Usuário ou senha incorretos');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center">
            <Pizza className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-mono">Fila Dom Fiorentino</h1>
          <p className="text-muted-foreground mt-2">Acesso restrito</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <span className="text-muted-foreground text-sm">Área protegida</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Usuário</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Entrar
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Sistema de gerenciamento de entregas
        </p>
      </div>
    </div>
  );
}
