-- 00_schema_estrutura.sql
-- Esquema completo das tabelas usadas pelo projeto
-- Rode este arquivo primeiro no SQL editor do SEU projeto Supabase.

-- Extensões necessárias
create extension if not exists "pgcrypto";

-- Enum de papéis da aplicação
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
END;
$$;

-- Função utilitária para updated_at (já existe em muitos projetos, mas incluímos por segurança)
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tabela: franquias
create table if not exists public.franquias (
  id uuid primary key default gen_random_uuid(),
  nome_franquia text not null,
  slug text not null,
  config_pagamento jsonb null,
  created_at timestamptz null default now(),
  data_vencimento date null,
  horario_reset time without time zone null default '03:00:00'::time without time zone,
  plano_limite_lojas integer null default 1,
  status_pagamento text null default 'ativo'::text
);

-- Tabela: unidades
create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null,
  nome_loja text not null,
  config_whatsapp jsonb null,
  config_sheets_url text null,
  created_at timestamptz null default now()
);

-- Tabela: entregadores
create table if not exists public.entregadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  unidade text not null,
  unidade_id uuid null,
  franquia_id uuid null,
  status text not null default 'disponivel'::text,
  tipo_bag text null default 'normal'::text,
  ativo boolean not null default true,
  fila_posicao timestamptz null default now(),
  turno_inicio time without time zone null default '16:00:00'::time without time zone,
  turno_fim time without time zone null default '02:00:00'::time without time zone,
  usar_turno_padrao boolean null default true,
  dias_trabalho jsonb null default '{"dom": true, "seg": true, "ter": true, "qua": true, "qui": true, "sex": true, "sab": true}'::jsonb,
  hora_saida timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela: historico_entregas
create table if not exists public.historico_entregas (
  id uuid primary key default gen_random_uuid(),
  entregador_id uuid not null,
  franquia_id uuid null,
  unidade_id uuid null,
  unidade text not null,
  tipo_bag text null default 'normal'::text,
  hora_saida timestamptz not null default now(),
  hora_retorno timestamptz null,
  created_at timestamptz not null default now()
);

-- Tabela: global_config
create table if not exists public.global_config (
  id uuid primary key default gen_random_uuid(),
  config_key text not null,
  config_value text not null,
  created_at timestamptz null default now(),
  updated_at timestamptz null default now()
);

-- Tabela: system_config
create table if not exists public.system_config (
  id uuid primary key default gen_random_uuid(),
  unidade text not null,
  webhook_url text null,
  nome_loja text null,
  created_at timestamptz null default now(),
  updated_at timestamptz null default now()
);

-- Tabela: planos
create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null,
  descricao text null,
  valor_base numeric not null,
  duracao_meses integer not null default 1,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Tabela: unidade_planos
create table if not exists public.unidade_planos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null,
  plano_id uuid not null,
  valor numeric not null,
  desconto_percent numeric not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Tabela: franquia_bag_tipos
create table if not exists public.franquia_bag_tipos (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null,
  nome text not null,
  descricao text null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Tabela: unidade_bag_tipos
create table if not exists public.unidade_bag_tipos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null,
  bag_tipo_id uuid not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Tabela: logs_auditoria
create table if not exists public.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid null,
  usuario_email text null,
  acao text null,
  detalhes jsonb null,
  created_at timestamptz null default now()
);

-- Tabela: system_users
create table if not exists public.system_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  role public.app_role not null default 'user',
  unidade text not null default 'ITAQUA'::text,
  unidade_id uuid null,
  franquia_id uuid null,
  created_at timestamptz null default now(),
  updated_at timestamptz null default now()
);

-- Tabela: user_unidades
create table if not exists public.user_unidades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  unidade_id uuid not null,
  created_at timestamptz not null default now()
);

-- Relacionamentos (FOREIGN KEYS)
alter table public.unidades
  add constraint unidades_franquia_id_fkey
  foreign key (franquia_id) references public.franquias(id) on delete cascade;

alter table public.entregadores
  add constraint entregadores_franquia_id_fkey
  foreign key (franquia_id) references public.franquias(id) on delete set null;

alter table public.entregadores
  add constraint entregadores_unidade_id_fkey
  foreign key (unidade_id) references public.unidades(id) on delete set null;

alter table public.historico_entregas
  add constraint historico_entregas_entregador_id_fkey
  foreign key (entregador_id) references public.entregadores(id) on delete cascade;

alter table public.historico_entregas
  add constraint historico_entregas_franquia_id_fkey
  foreign key (franquia_id) references public.franquias(id) on delete set null;

alter table public.historico_entregas
  add constraint historico_entregas_unidade_id_fkey
  foreign key (unidade_id) references public.unidades(id) on delete set null;

alter table public.franquia_bag_tipos
  add constraint franquia_bag_tipos_franquia_id_fkey
  foreign key (franquia_id) references public.franquias(id) on delete cascade;

alter table public.unidade_bag_tipos
  add constraint unidade_bag_tipos_bag_tipo_id_fkey
  foreign key (bag_tipo_id) references public.franquia_bag_tipos(id) on delete cascade;

alter table public.unidade_bag_tipos
  add constraint unidade_bag_tipos_unidade_id_fkey
  foreign key (unidade_id) references public.unidades(id) on delete cascade;

alter table public.unidade_planos
  add constraint unidade_planos_plano_id_fkey
  foreign key (plano_id) references public.planos(id) on delete cascade;

alter table public.unidade_planos
  add constraint unidade_planos_unidade_id_fkey
  foreign key (unidade_id) references public.unidades(id) on delete cascade;

alter table public.logs_auditoria
  add constraint logs_auditoria_franquia_id_fkey
  foreign key (franquia_id) references public.franquias(id) on delete set null;

alter table public.system_users
  add constraint system_users_franquia_id_fkey
  foreign key (franquia_id) references public.franquias(id) on delete set null;

alter table public.system_users
  add constraint system_users_unidade_id_fkey
  foreign key (unidade_id) references public.unidades(id) on delete set null;

alter table public.user_unidades
  add constraint user_unidades_unidade_id_fkey
  foreign key (unidade_id) references public.unidades(id) on delete cascade;

alter table public.user_unidades
  add constraint user_unidades_user_id_fkey
  foreign key (user_id) references public.system_users(id) on delete cascade;

-- =========================
-- DADOS INICIAIS (SEED)
-- =========================

-- 1) franquias
insert into public.franquias (id, nome_franquia, slug, config_pagamento, created_at, data_vencimento, horario_reset, plano_limite_lojas, status_pagamento) values
  ('6d1fd941-2756-4b04-8ac3-8dfd22ee83fe', 'Dom Fiorentino', 'dom-fiorentino', '{"api_key": null, "plano_id": "fec6d950-b42a-4077-b303-a1003fc3a40d", "provider": "asas", "valor_plano": null, "webhook_url": null, "whatsapp": {"api_key": "E7BCA4BB4535-4C3C-8C97-744315F4DECE", "instance": "pizzaria", "url": "https://dom-evolution-api.adhwpy.easypanel.host/"}}'::jsonb, '2025-12-27 09:42:57.560766+00', '2026-01-27', '03:00:00', 3, 'ativo'),
  ('fe1aeced-7e15-4481-9df8-c2a05b9abd04', 'teste', 'teste', '{"api_key": null, "evolution_instance": null, "provider": "asas", "webhook_url": null}'::jsonb, '2025-12-27 10:50:56.182137+00', '2025-12-28', '03:00:00', 1, 'ativo');

-- 2) unidades
insert into public.unidades (id, franquia_id, nome_loja, config_whatsapp, config_sheets_url, created_at) values
  ('14bb566c-c8d0-4b96-8da7-8eecea2d6738', '6d1fd941-2756-4b04-8ac3-8dfd22ee83fe', 'Itaquaquecetuba', null, null, '2025-12-27 10:16:39.278439+00'),
  ('82a71bed-9c87-48a4-8eaa-cb13ed2f3514', '6d1fd941-2756-4b04-8ac3-8dfd22ee83fe', 'Poá', null, null, '2025-12-27 10:16:39.278439+00'),
  ('f84d6f35-cf8f-48fd-965d-1d6d2fe0a204', '6d1fd941-2756-4b04-8ac3-8dfd22ee83fe', 'Suzano', null, null, '2025-12-27 10:16:39.278439+00'),
  ('609f801f-16b3-4d90-8ee6-73affe706bb8', 'fe1aeced-7e15-4481-9df8-c2a05b9abd04', 'Loja teste', null, null, '2025-12-27 10:51:46.400574+00');

-- 3) planos
insert into public.planos (id, nome, tipo, descricao, valor_base, duracao_meses, ativo, created_at) values
  ('fec6d950-b42a-4077-b303-a1003fc3a40d', 'Plano Mensal', 'mensal', null, 250.00, 1, true, '2025-12-28 07:23:58.390391+00'),
  ('6eb4655e-f632-4a41-b756-8df42baa8bb5', 'Plano Anual', 'mensal', null, 200.00, 12, true, '2025-12-28 07:24:25.974499+00');

-- 4) unidade_planos (sem registros atuais)

-- 5) franquia_bag_tipos
insert into public.franquia_bag_tipos (id, franquia_id, nome, descricao, ativo, created_at) values
  ('be2b45e0-068e-4a74-9d5c-215275a4f012', '6d1fd941-2756-4b04-8ac3-8dfd22ee83fe', 'Bag normal', null, true, '2025-12-27 11:27:29.044103+00'),
  ('001ef32e-57f2-4742-ac7f-2a3e45c3e949', '6d1fd941-2756-4b04-8ac3-8dfd22ee83fe', 'Bag metro', null, true, '2025-12-27 11:27:32.591986+00');

-- 6) unidade_bag_tipos (sem registros atuais)

-- 7) system_users
insert into public.system_users (id, username, password_hash, role, unidade, unidade_id, franquia_id, created_at, updated_at) values
  ('29d6ecc8-94f6-4c22-bc78-e4b08eba5403', 'Radizy', '1324', 'admin', 'ITAQUA', null, null, '2025-12-27 09:42:57.560766+00', '2025-12-27 09:42:57.560766+00'),
  ('3f10c5f3-0b8c-4068-a284-a1323e328984', 'expitaqua', '1324', 'user', 'ITAQUA', '14bb566c-c8d0-4b96-8da7-8eecea2d6738', '6d1fd941-2756-4b04-8ac3-8dfd22ee83fe', '2025-12-27 09:42:57.560766+00', '2025-12-28 07:36:10.136221+00'),
  ('19c77d8c-a5f0-46ba-948c-046922fd6acb', 'exppoa', '123', 'user', 'POA', '82a71bed-9c87-48a4-8eaa-cb13ed2f3514', '6d1fd941-2756-4b04-8ac3-8dfd22ee83fe', '2025-12-27 10:16:39.278439+00', '2025-12-28 07:36:22.132154+00'),
  ('1f7c46a5-cb5a-44b0-a557-f3b9be52ca6f', 'fiscalisaque', '1324', 'admin', 'ITAQUA', null, '6d1fd941-2756-4b04-8ac3-8dfd22ee83fe', '2025-12-27 10:16:39.278439+00', '2025-12-28 07:36:26.230928+00'),
  ('93d32a97-d63c-420c-93d8-9d764765ed81', 'expsuzano', '123', 'user', 'SUZANO', 'f84d6f35-cf8f-48fd-965d-1d6d2fe0a204', '6d1fd941-2756-4b04-8ac3-8dfd22ee83fe', '2025-12-27 10:16:39.278439+00', '2025-12-27 11:05:24.25944+00'),
  ('cc7b8016-323b-44df-b7f7-8751413db754', 'Ciroteste', 'ciroteste', 'admin', 'ITAQUA', null, null, '2025-12-27 10:51:58.84701+00', '2025-12-28 07:45:46.849742+00');

-- 8) user_unidades (sem registros atuais)

-- 9) entregadores
-- OBS: Há muitos registros em entregadores. Para manter o arquivo manejável,
-- você pode exportar via ferramenta SQL do seu banco e colar aqui em formato INSERT.

-- 10) historico_entregas
-- OBS: Idem acima: exporte os registros atuais, se quiser clonar o histórico completo.

-- 11) global_config (sem registros atuais)

-- 12) system_config (sem registros atuais)

-- 13) logs_auditoria (sem registros atuais)

-- Rode este arquivo APENAS uma vez em um banco vazio, para evitar conflitos de IDs
-- ou chaves únicas ao recriar o ambiente completo.
