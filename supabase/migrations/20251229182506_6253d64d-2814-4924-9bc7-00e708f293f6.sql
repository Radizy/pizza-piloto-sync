-- Garantir search_path fixo para função set_timestamp
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;