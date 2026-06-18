-- Atölye OS — "Görevler" sekmesi için tablo
-- Supabase > SQL Editor'da bir kez çalıştır.

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists project_tasks_project_id_idx
  on public.project_tasks (project_id);

-- RLS: projects tablosundaki mevcut kurulumla aynı mantık.
-- Uygulama anonim publishable key ile bağlandığından, anon role'üne izin veriyoruz.
-- NOT: Bu, projeyi herkese açık yapar. İleride Supabase Auth ekleyip
-- bu politikaları "auth.uid() = owner_id" gibi bir kurala daraltman önerilir.
alter table public.project_tasks enable row level security;

drop policy if exists "project_tasks_anon_all" on public.project_tasks;
create policy "project_tasks_anon_all"
  on public.project_tasks
  for all
  to anon
  using (true)
  with check (true);
