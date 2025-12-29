CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: entregadores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entregadores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    telefone text NOT NULL,
    unidade text NOT NULL,
    status text DEFAULT 'disponivel'::text NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fila_posicao timestamp with time zone DEFAULT now(),
    dias_trabalho jsonb DEFAULT '{"dom": true, "qua": true, "qui": true, "sab": true, "seg": true, "sex": true, "ter": true}'::jsonb,
    usar_turno_padrao boolean DEFAULT true,
    turno_inicio time without time zone DEFAULT '16:00:00'::time without time zone,
    turno_fim time without time zone DEFAULT '02:00:00'::time without time zone,
    hora_saida timestamp with time zone,
    tipo_bag text DEFAULT 'normal'::text,
    franquia_id uuid,
    unidade_id uuid,
    CONSTRAINT entregadores_status_check CHECK ((status = ANY (ARRAY['disponivel'::text, 'chamado'::text, 'entregando'::text]))),
    CONSTRAINT entregadores_unidade_check CHECK ((unidade = ANY (ARRAY['ITAQUA'::text, 'POA'::text, 'SUZANO'::text])))
);


--
-- Name: franquia_bag_tipos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.franquia_bag_tipos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    franquia_id uuid NOT NULL,
    nome text NOT NULL,
    descricao text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: franquias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.franquias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_franquia text NOT NULL,
    slug text NOT NULL,
    status_pagamento text DEFAULT 'ativo'::text,
    plano_limite_lojas integer DEFAULT 1,
    horario_reset time without time zone DEFAULT '03:00:00'::time without time zone,
    config_pagamento jsonb,
    created_at timestamp with time zone DEFAULT now(),
    data_vencimento date
);


--
-- Name: global_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key text NOT NULL,
    config_value text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: historico_entregas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historico_entregas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entregador_id uuid NOT NULL,
    unidade text NOT NULL,
    hora_saida timestamp with time zone DEFAULT now() NOT NULL,
    hora_retorno timestamp with time zone,
    tipo_bag text DEFAULT 'normal'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    franquia_id uuid,
    unidade_id uuid
);


--
-- Name: logs_auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    franquia_id uuid,
    usuario_email text,
    acao text,
    detalhes jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: modulos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modulos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo text NOT NULL,
    nome text NOT NULL,
    descricao text,
    preco_mensal numeric DEFAULT 0,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: pacotes_comerciais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pacotes_comerciais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo text NOT NULL,
    nome text NOT NULL,
    descricao text,
    plano_id uuid,
    modulos_inclusos jsonb DEFAULT '[]'::jsonb,
    preco_total numeric NOT NULL,
    desconto_percent numeric DEFAULT 0,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: planos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    tipo text NOT NULL,
    valor_base numeric(10,2) NOT NULL,
    descricao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    duracao_meses integer DEFAULT 1 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    dias_trial integer DEFAULT 7,
    forma_cobranca text DEFAULT 'mensal'::text,
    permite_trial boolean DEFAULT true,
    CONSTRAINT planos_forma_cobranca_check CHECK ((forma_cobranca = ANY (ARRAY['mensal'::text, 'anual'::text, 'manual'::text]))),
    CONSTRAINT planos_tipo_check CHECK ((tipo = ANY (ARRAY['mensal'::text, 'anual'::text])))
);


--
-- Name: senhas_pagamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.senhas_pagamento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unidade_id uuid NOT NULL,
    franquia_id uuid NOT NULL,
    numero_senha text NOT NULL,
    entregador_id uuid,
    entregador_nome text,
    status text DEFAULT 'aguardando'::text,
    chamado_em timestamp with time zone,
    atendido_em timestamp with time zone,
    expira_em timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT senhas_pagamento_status_check CHECK ((status = ANY (ARRAY['aguardando'::text, 'chamado'::text, 'atendido'::text, 'expirado'::text])))
);


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unidade text NOT NULL,
    webhook_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    nome_loja text
);


--
-- Name: system_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    unidade text DEFAULT 'ITAQUA'::text NOT NULL,
    franquia_id uuid,
    unidade_id uuid
);


--
-- Name: unidade_bag_tipos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidade_bag_tipos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unidade_id uuid NOT NULL,
    bag_tipo_id uuid NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: unidade_modulos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidade_modulos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unidade_id uuid NOT NULL,
    modulo_codigo text NOT NULL,
    ativo boolean DEFAULT true,
    data_ativacao timestamp with time zone DEFAULT now(),
    data_expiracao timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: unidade_planos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidade_planos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unidade_id uuid NOT NULL,
    plano_id uuid NOT NULL,
    valor numeric(10,2) NOT NULL,
    desconto_percent numeric(5,2) DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: unidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    franquia_id uuid NOT NULL,
    nome_loja text NOT NULL,
    config_whatsapp jsonb,
    config_sheets_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_unidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_unidades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    unidade_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapp_historico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_historico (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unidade_id uuid NOT NULL,
    entregador_id uuid,
    telefone text NOT NULL,
    mensagem text NOT NULL,
    tipo text,
    enviado_em timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: whatsapp_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unidade_id uuid NOT NULL,
    codigo text NOT NULL,
    titulo text NOT NULL,
    mensagem text NOT NULL,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: entregadores entregadores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entregadores
    ADD CONSTRAINT entregadores_pkey PRIMARY KEY (id);


--
-- Name: franquia_bag_tipos franquia_bag_tipos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.franquia_bag_tipos
    ADD CONSTRAINT franquia_bag_tipos_pkey PRIMARY KEY (id);


--
-- Name: franquias franquias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.franquias
    ADD CONSTRAINT franquias_pkey PRIMARY KEY (id);


--
-- Name: franquias franquias_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.franquias
    ADD CONSTRAINT franquias_slug_key UNIQUE (slug);


--
-- Name: global_config global_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_config
    ADD CONSTRAINT global_config_config_key_key UNIQUE (config_key);


--
-- Name: global_config global_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_config
    ADD CONSTRAINT global_config_pkey PRIMARY KEY (id);


--
-- Name: historico_entregas historico_entregas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_entregas
    ADD CONSTRAINT historico_entregas_pkey PRIMARY KEY (id);


--
-- Name: logs_auditoria logs_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_auditoria
    ADD CONSTRAINT logs_auditoria_pkey PRIMARY KEY (id);


--
-- Name: modulos modulos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_codigo_key UNIQUE (codigo);


--
-- Name: modulos modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_pkey PRIMARY KEY (id);


--
-- Name: pacotes_comerciais pacotes_comerciais_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacotes_comerciais
    ADD CONSTRAINT pacotes_comerciais_codigo_key UNIQUE (codigo);


--
-- Name: pacotes_comerciais pacotes_comerciais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacotes_comerciais
    ADD CONSTRAINT pacotes_comerciais_pkey PRIMARY KEY (id);


--
-- Name: planos planos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planos
    ADD CONSTRAINT planos_pkey PRIMARY KEY (id);


--
-- Name: senhas_pagamento senhas_pagamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.senhas_pagamento
    ADD CONSTRAINT senhas_pagamento_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: system_users system_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_pkey PRIMARY KEY (id);


--
-- Name: system_users system_users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_username_key UNIQUE (username);


--
-- Name: unidade_bag_tipos unidade_bag_tipos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidade_bag_tipos
    ADD CONSTRAINT unidade_bag_tipos_pkey PRIMARY KEY (id);


--
-- Name: unidade_modulos unidade_modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidade_modulos
    ADD CONSTRAINT unidade_modulos_pkey PRIMARY KEY (id);


--
-- Name: unidade_modulos unidade_modulos_unidade_id_modulo_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidade_modulos
    ADD CONSTRAINT unidade_modulos_unidade_id_modulo_codigo_key UNIQUE (unidade_id, modulo_codigo);


--
-- Name: unidade_planos unidade_planos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidade_planos
    ADD CONSTRAINT unidade_planos_pkey PRIMARY KEY (id);


--
-- Name: unidade_planos unidade_planos_unidade_id_plano_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidade_planos
    ADD CONSTRAINT unidade_planos_unidade_id_plano_id_key UNIQUE (unidade_id, plano_id);


--
-- Name: unidades unidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT unidades_pkey PRIMARY KEY (id);


--
-- Name: user_unidades user_unidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_unidades
    ADD CONSTRAINT user_unidades_pkey PRIMARY KEY (id);


--
-- Name: user_unidades user_unidades_user_id_unidade_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_unidades
    ADD CONSTRAINT user_unidades_user_id_unidade_id_key UNIQUE (user_id, unidade_id);


--
-- Name: whatsapp_historico whatsapp_historico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_historico
    ADD CONSTRAINT whatsapp_historico_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_templates whatsapp_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_templates whatsapp_templates_unidade_id_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_unidade_id_codigo_key UNIQUE (unidade_id, codigo);


--
-- Name: idx_senhas_pagamento_ativas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_senhas_pagamento_ativas ON public.senhas_pagamento USING btree (unidade_id, status, expira_em);


--
-- Name: entregadores update_entregadores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_entregadores_updated_at BEFORE UPDATE ON public.entregadores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: global_config update_global_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_global_config_updated_at BEFORE UPDATE ON public.global_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pacotes_comerciais update_pacotes_comerciais_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pacotes_comerciais_updated_at BEFORE UPDATE ON public.pacotes_comerciais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: senhas_pagamento update_senhas_pagamento_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_senhas_pagamento_updated_at BEFORE UPDATE ON public.senhas_pagamento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_config update_system_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_users update_system_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_users_updated_at BEFORE UPDATE ON public.system_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: whatsapp_templates update_whatsapp_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entregadores entregadores_franquia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entregadores
    ADD CONSTRAINT entregadores_franquia_id_fkey FOREIGN KEY (franquia_id) REFERENCES public.franquias(id);


--
-- Name: entregadores entregadores_unidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entregadores
    ADD CONSTRAINT entregadores_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id);


--
-- Name: franquia_bag_tipos franquia_bag_tipos_franquia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.franquia_bag_tipos
    ADD CONSTRAINT franquia_bag_tipos_franquia_id_fkey FOREIGN KEY (franquia_id) REFERENCES public.franquias(id) ON DELETE CASCADE;


--
-- Name: historico_entregas historico_entregas_entregador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_entregas
    ADD CONSTRAINT historico_entregas_entregador_id_fkey FOREIGN KEY (entregador_id) REFERENCES public.entregadores(id) ON DELETE CASCADE;


--
-- Name: historico_entregas historico_entregas_franquia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_entregas
    ADD CONSTRAINT historico_entregas_franquia_id_fkey FOREIGN KEY (franquia_id) REFERENCES public.franquias(id);


--
-- Name: historico_entregas historico_entregas_unidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_entregas
    ADD CONSTRAINT historico_entregas_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id);


--
-- Name: logs_auditoria logs_auditoria_franquia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_auditoria
    ADD CONSTRAINT logs_auditoria_franquia_id_fkey FOREIGN KEY (franquia_id) REFERENCES public.franquias(id);


--
-- Name: pacotes_comerciais pacotes_comerciais_plano_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacotes_comerciais
    ADD CONSTRAINT pacotes_comerciais_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES public.planos(id) ON DELETE SET NULL;


--
-- Name: senhas_pagamento senhas_pagamento_entregador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.senhas_pagamento
    ADD CONSTRAINT senhas_pagamento_entregador_id_fkey FOREIGN KEY (entregador_id) REFERENCES public.entregadores(id) ON DELETE SET NULL;


--
-- Name: senhas_pagamento senhas_pagamento_franquia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.senhas_pagamento
    ADD CONSTRAINT senhas_pagamento_franquia_id_fkey FOREIGN KEY (franquia_id) REFERENCES public.franquias(id) ON DELETE CASCADE;


--
-- Name: senhas_pagamento senhas_pagamento_unidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.senhas_pagamento
    ADD CONSTRAINT senhas_pagamento_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE CASCADE;


--
-- Name: system_users system_users_franquia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_franquia_id_fkey FOREIGN KEY (franquia_id) REFERENCES public.franquias(id);


--
-- Name: system_users system_users_unidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id);


--
-- Name: unidade_bag_tipos unidade_bag_tipos_bag_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidade_bag_tipos
    ADD CONSTRAINT unidade_bag_tipos_bag_tipo_id_fkey FOREIGN KEY (bag_tipo_id) REFERENCES public.franquia_bag_tipos(id) ON DELETE CASCADE;


--
-- Name: unidade_bag_tipos unidade_bag_tipos_unidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidade_bag_tipos
    ADD CONSTRAINT unidade_bag_tipos_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE CASCADE;


--
-- Name: unidade_modulos unidade_modulos_unidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidade_modulos
    ADD CONSTRAINT unidade_modulos_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE CASCADE;


--
-- Name: unidade_planos unidade_planos_plano_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidade_planos
    ADD CONSTRAINT unidade_planos_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES public.planos(id) ON DELETE CASCADE;


--
-- Name: unidade_planos unidade_planos_unidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidade_planos
    ADD CONSTRAINT unidade_planos_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE CASCADE;


--
-- Name: unidades unidades_franquia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT unidades_franquia_id_fkey FOREIGN KEY (franquia_id) REFERENCES public.franquias(id) ON DELETE CASCADE;


--
-- Name: user_unidades user_unidades_unidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_unidades
    ADD CONSTRAINT user_unidades_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE CASCADE;


--
-- Name: user_unidades user_unidades_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_unidades
    ADD CONSTRAINT user_unidades_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.system_users(id) ON DELETE CASCADE;


--
-- Name: whatsapp_historico whatsapp_historico_entregador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_historico
    ADD CONSTRAINT whatsapp_historico_entregador_id_fkey FOREIGN KEY (entregador_id) REFERENCES public.entregadores(id) ON DELETE SET NULL;


--
-- Name: whatsapp_historico whatsapp_historico_unidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_historico
    ADD CONSTRAINT whatsapp_historico_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE CASCADE;


--
-- Name: whatsapp_templates whatsapp_templates_unidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE CASCADE;


--
-- Name: entregadores Anyone can create entregadores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create entregadores" ON public.entregadores FOR INSERT WITH CHECK (true);


--
-- Name: historico_entregas Anyone can create historico_entregas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create historico_entregas" ON public.historico_entregas FOR INSERT WITH CHECK (true);


--
-- Name: entregadores Anyone can delete entregadores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete entregadores" ON public.entregadores FOR DELETE USING (true);


--
-- Name: historico_entregas Anyone can delete historico_entregas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete historico_entregas" ON public.historico_entregas FOR DELETE USING (true);


--
-- Name: global_config Anyone can manage global_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage global_config" ON public.global_config USING (true);


--
-- Name: modulos Anyone can manage modulos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage modulos" ON public.modulos USING (true) WITH CHECK (true);


--
-- Name: pacotes_comerciais Anyone can manage pacotes_comerciais; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage pacotes_comerciais" ON public.pacotes_comerciais USING (true) WITH CHECK (true);


--
-- Name: planos Anyone can manage planos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage planos" ON public.planos USING (true) WITH CHECK (true);


--
-- Name: senhas_pagamento Anyone can manage senhas_pagamento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage senhas_pagamento" ON public.senhas_pagamento USING (true) WITH CHECK (true);


--
-- Name: system_config Anyone can manage system_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage system_config" ON public.system_config USING (true);


--
-- Name: system_users Anyone can manage system_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage system_users" ON public.system_users USING (true);


--
-- Name: unidade_modulos Anyone can manage unidade_modulos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage unidade_modulos" ON public.unidade_modulos USING (true) WITH CHECK (true);


--
-- Name: unidade_planos Anyone can manage unidade_planos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage unidade_planos" ON public.unidade_planos USING (true) WITH CHECK (true);


--
-- Name: user_unidades Anyone can manage user_unidades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage user_unidades" ON public.user_unidades USING (true) WITH CHECK (true);


--
-- Name: whatsapp_historico Anyone can manage whatsapp_historico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage whatsapp_historico" ON public.whatsapp_historico USING (true) WITH CHECK (true);


--
-- Name: whatsapp_templates Anyone can manage whatsapp_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage whatsapp_templates" ON public.whatsapp_templates USING (true) WITH CHECK (true);


--
-- Name: global_config Anyone can read global_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read global_config" ON public.global_config FOR SELECT USING (true);


--
-- Name: modulos Anyone can read modulos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read modulos" ON public.modulos FOR SELECT USING (true);


--
-- Name: pacotes_comerciais Anyone can read pacotes_comerciais; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read pacotes_comerciais" ON public.pacotes_comerciais FOR SELECT USING (true);


--
-- Name: senhas_pagamento Anyone can read senhas_pagamento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read senhas_pagamento" ON public.senhas_pagamento FOR SELECT USING (true);


--
-- Name: system_config Anyone can read system_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read system_config" ON public.system_config FOR SELECT USING (true);


--
-- Name: system_users Anyone can read system_users for login; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read system_users for login" ON public.system_users FOR SELECT USING (true);


--
-- Name: unidade_modulos Anyone can read unidade_modulos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read unidade_modulos" ON public.unidade_modulos FOR SELECT USING (true);


--
-- Name: whatsapp_historico Anyone can read whatsapp_historico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read whatsapp_historico" ON public.whatsapp_historico FOR SELECT USING (true);


--
-- Name: whatsapp_templates Anyone can read whatsapp_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read whatsapp_templates" ON public.whatsapp_templates FOR SELECT USING (true);


--
-- Name: entregadores Anyone can update entregadores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update entregadores" ON public.entregadores FOR UPDATE USING (true);


--
-- Name: historico_entregas Anyone can update historico_entregas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update historico_entregas" ON public.historico_entregas FOR UPDATE USING (true);


--
-- Name: entregadores Anyone can view entregadores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view entregadores" ON public.entregadores FOR SELECT USING (true);


--
-- Name: historico_entregas Anyone can view historico_entregas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view historico_entregas" ON public.historico_entregas FOR SELECT USING (true);


--
-- Name: entregadores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.entregadores ENABLE ROW LEVEL SECURITY;

--
-- Name: franquia_bag_tipos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.franquia_bag_tipos ENABLE ROW LEVEL SECURITY;

--
-- Name: franquia_bag_tipos franquia_bag_tipos_permissive_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY franquia_bag_tipos_permissive_all ON public.franquia_bag_tipos USING (true) WITH CHECK (true);


--
-- Name: franquias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.franquias ENABLE ROW LEVEL SECURITY;

--
-- Name: franquias franquias_permissive_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY franquias_permissive_all ON public.franquias USING (true) WITH CHECK (true);


--
-- Name: global_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_config ENABLE ROW LEVEL SECURITY;

--
-- Name: historico_entregas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.historico_entregas ENABLE ROW LEVEL SECURITY;

--
-- Name: logs_auditoria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

--
-- Name: logs_auditoria logs_auditoria_permissive_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY logs_auditoria_permissive_all ON public.logs_auditoria USING (true) WITH CHECK (true);


--
-- Name: modulos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

--
-- Name: pacotes_comerciais; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pacotes_comerciais ENABLE ROW LEVEL SECURITY;

--
-- Name: planos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

--
-- Name: senhas_pagamento; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.senhas_pagamento ENABLE ROW LEVEL SECURITY;

--
-- Name: system_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

--
-- Name: system_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;

--
-- Name: unidade_bag_tipos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.unidade_bag_tipos ENABLE ROW LEVEL SECURITY;

--
-- Name: unidade_bag_tipos unidade_bag_tipos_permissive_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY unidade_bag_tipos_permissive_all ON public.unidade_bag_tipos USING (true) WITH CHECK (true);


--
-- Name: unidade_modulos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.unidade_modulos ENABLE ROW LEVEL SECURITY;

--
-- Name: unidade_planos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.unidade_planos ENABLE ROW LEVEL SECURITY;

--
-- Name: unidades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

--
-- Name: unidades unidades_permissive_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY unidades_permissive_all ON public.unidades USING (true) WITH CHECK (true);


--
-- Name: user_unidades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_unidades ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_historico; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_historico ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;