-- Atölye OS — "Notlar" sekmesi için tablo
-- Supabase > SQL Editor'da bu içeriği kopyalayıp bir kez çalıştır.

create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_notes_project_id_idx
  on public.project_notes (project_id);

-- RLS: project_tasks ile aynı mantık (anon role'üne açık).
alter table public.project_notes enable row level security;

drop policy if exists "project_notes_anon_all" on public.project_notes;
create policy "project_notes_anon_all"
  on public.project_notes
  for all
  to anon
  using (true)
  with check (true);
