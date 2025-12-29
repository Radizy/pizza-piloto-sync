-- 02_reset_estrutura.sql
-- Script utilitário para limpar completamente as tabelas e policies deste projeto
-- ATENÇÃO: rode apenas em um ambiente de teste ou antes de recriar tudo com 00/01.

-- 1) Remover policies de todas as tabelas públicas usadas
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'entregadores', 'franquia_bag_tipos', 'franquias', 'global_config',
        'historico_entregas', 'logs_auditoria', 'modulos', 'pacotes_comerciais',
        'planos', 'senhas_pagamento', 'system_config', 'system_users',
        'unidade_bag_tipos', 'unidade_modulos', 'unidade_planos', 'unidades',
        'user_unidades', 'whatsapp_historico', 'whatsapp_templates'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 2) Desabilitar RLS nas tabelas
ALTER TABLE IF EXISTS public.entregadores DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.historico_entregas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.global_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.planos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.unidade_planos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.franquia_bag_tipos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.unidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.unidade_bag_tipos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.logs_auditoria DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.franquias DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_unidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.modulos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pacotes_comerciais DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.unidade_modulos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.unidade_planos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.senhas_pagamento DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_historico DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_templates DISABLE ROW LEVEL SECURITY;

-- 3) Dropar tabelas na ordem segura (filhas primeiro)
DROP TABLE IF EXISTS public.user_unidades CASCADE;
DROP TABLE IF EXISTS public.unidade_planos CASCADE;
DROP TABLE IF EXISTS public.unidade_bag_tipos CASCADE;
DROP TABLE IF EXISTS public.unidade_modulos CASCADE;
DROP TABLE IF EXISTS public.unidade_planos CASCADE;
DROP TABLE IF EXISTS public.whatsapp_historico CASCADE;
DROP TABLE IF EXISTS public.whatsapp_templates CASCADE;
DROP TABLE IF EXISTS public.senhas_pagamento CASCADE;
DROP TABLE IF EXISTS public.historico_entregas CASCADE;
DROP TABLE IF EXISTS public.entregadores CASCADE;
DROP TABLE IF EXISTS public.logs_auditoria CASCADE;
DROP TABLE IF EXISTS public.franquia_bag_tipos CASCADE;
DROP TABLE IF EXISTS public.modulos CASCADE;
DROP TABLE IF EXISTS public.pacotes_comerciais CASCADE;
DROP TABLE IF EXISTS public.unidades CASCADE;
DROP TABLE IF EXISTS public.system_users CASCADE;
DROP TABLE IF EXISTS public.franquias CASCADE;
DROP TABLE IF EXISTS public.global_config CASCADE;
DROP TABLE IF EXISTS public.system_config CASCADE;

-- Depois de rodar este arquivo, execute 00_schema_estrutura.sql e 01_policies_rls.sql
-- para recriar toda a estrutura e as policies do projeto.
