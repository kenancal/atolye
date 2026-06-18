-- Atölye OS — "Dosyalar" sekmesi için tablo
-- Supabase > SQL Editor'da bu içeriği kopyalayıp bir kez çalıştır.

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_files_project_id_idx
  on public.project_files (project_id);

-- RLS: diğer tablolarla aynı mantık (anon role'üne açık).
alter table public.project_files enable row level security;

drop policy if exists "project_files_anon_all" on public.project_files;
create policy "project_files_anon_all"
  on public.project_files
  for all
  to anon
  using (true)
  with check (true);
