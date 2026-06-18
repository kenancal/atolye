-- Atölye OS — "Yol Haritası" sekmesi için tablo
-- Supabase > SQL Editor'da bu içeriği kopyalayıp bir kez çalıştır.

create table if not exists public.project_roadmap (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  target_date date,
  status text not null default 'Planlandı',
  created_at timestamptz not null default now()
);

create index if not exists project_roadmap_project_id_idx
  on public.project_roadmap (project_id);

-- RLS: diğer tablolarla aynı mantık (anon role'üne açık).
alter table public.project_roadmap enable row level security;

drop policy if exists "project_roadmap_anon_all" on public.project_roadmap;
create policy "project_roadmap_anon_all"
  on public.project_roadmap
  for all
  to anon
  using (true)
  with check (true);
