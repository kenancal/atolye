-- Atölye OS — "Rakipler" sekmesi için tablo
-- Supabase > SQL Editor'da bu içeriği kopyalayıp bir kez çalıştır.

create table if not exists public.project_competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  url text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists project_competitors_project_id_idx
  on public.project_competitors (project_id);

-- RLS: diğer tablolarla aynı mantık (anon role'üne açık).
alter table public.project_competitors enable row level security;

drop policy if exists "project_competitors_anon_all" on public.project_competitors;
create policy "project_competitors_anon_all"
  on public.project_competitors
  for all
  to anon
  using (true)
  with check (true);
