-- 01_policies_rls.sql
-- Policies e Row Level Security para todas as tabelas usadas pelo projeto
-- Rode este arquivo DEPOIS de 00_schema_estrutura.sql.

-- Entregadores
alter table public.entregadores enable row level security;

create policy "Anyone can view entregadores"
  on public.entregadores
  for select
  using (true);

create policy "Anyone can create entregadores"
  on public.entregadores
  for insert
  with check (true);

create policy "Anyone can update entregadores"
  on public.entregadores
  for update
  using (true);

create policy "Anyone can delete entregadores"
  on public.entregadores
  for delete
  using (true);

-- Historico entregas
alter table public.historico_entregas enable row level security;

create policy "Anyone can view historico_entregas"
  on public.historico_entregas
  for select
  using (true);

create policy "Anyone can create historico_entregas"
  on public.historico_entregas
  for insert
  with check (true);

create policy "Anyone can update historico_entregas"
  on public.historico_entregas
  for update
  using (true);

create policy "Anyone can delete historico_entregas"
  on public.historico_entregas
  for delete
  using (true);

-- Global config
alter table public.global_config enable row level security;

create policy "Anyone can read global_config"
  on public.global_config
  for select
  using (true);

create policy "Anyone can manage global_config"
  on public.global_config
  for all
  using (true);

-- System config
alter table public.system_config enable row level security;

create policy "Anyone can read system_config"
  on public.system_config
  for select
  using (true);

create policy "Anyone can manage system_config"
  on public.system_config
  for all
  using (true);

-- Planos
alter table public.planos enable row level security;

create policy "Anyone can manage planos"
  on public.planos
  for all
  using (true)
  with check (true);

-- Unidade planos
alter table public.unidade_planos enable row level security;

create policy "Anyone can manage unidade_planos"
  on public.unidade_planos
  for all
  using (true)
  with check (true);

-- Franquia bag tipos
alter table public.franquia_bag_tipos enable row level security;

create policy "franquia_bag_tipos_permissive_all"
  on public.franquia_bag_tipos
  for all
  using (true)
  with check (true);

-- Unidades
alter table public.unidades enable row level security;

create policy "unidades_permissive_all"
  on public.unidades
  for all
  using (true)
  with check (true);

-- Unidade bag tipos
alter table public.unidade_bag_tipos enable row level security;

create policy "unidade_bag_tipos_permissive_all"
  on public.unidade_bag_tipos
  for all
  using (true)
  with check (true);

-- Logs auditoria
alter table public.logs_auditoria enable row level security;

create policy "logs_auditoria_permissive_all"
  on public.logs_auditoria
  for all
  using (true)
  with check (true);

-- Franquias
alter table public.franquias enable row level security;

create policy "franquias_permissive_all"
  on public.franquias
  for all
  using (true)
  with check (true);

-- System users
alter table public.system_users enable row level security;

create policy "Anyone can manage system_users"
  on public.system_users
  for all
  using (true);

create policy "Anyone can read system_users for login"
  on public.system_users
  for select
  using (true);

-- User unidades
alter table public.user_unidades enable row level security;

create policy "Anyone can manage user_unidades"
  on public.user_unidades
  for all
  using (true)
  with check (true);
