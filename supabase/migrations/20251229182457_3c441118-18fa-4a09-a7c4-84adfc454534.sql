-- Habilitar RLS na tabela de cobranças de franquia
ALTER TABLE public.franquia_cobrancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY franquia_cobrancas_permissive_all
ON public.franquia_cobrancas
FOR ALL
USING (true)
WITH CHECK (true);