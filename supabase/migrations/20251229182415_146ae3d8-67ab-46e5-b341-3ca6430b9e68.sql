-- Tabela para registrar cobranças de franquias
CREATE TABLE IF NOT EXISTS public.franquia_cobrancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franquia_id uuid NOT NULL REFERENCES public.franquias(id) ON DELETE CASCADE,
  gateway text NOT NULL,
  external_id text NOT NULL,
  status text NOT NULL,
  valor numeric NOT NULL,
  vencimento timestamp with time zone,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (gateway, external_id)
);

-- Função para atualizar coluna updated_at
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para manter updated_at em franquia_cobrancas
DROP TRIGGER IF EXISTS set_timestamp_franquia_cobrancas ON public.franquia_cobrancas;
CREATE TRIGGER set_timestamp_franquia_cobrancas
BEFORE UPDATE ON public.franquia_cobrancas
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();