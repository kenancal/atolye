-- Atölye OS — proje "Reklam Fikirleri" sekmesi
-- Her satır bir reklam fikri: görsel + video (URL ya da yüklenmiş) + senaryo metni.
-- Supabase > SQL Editor'da bir kez çalıştır. RLS, bağlı projenin sahibine göre.

create table if not exists public.project_ad_ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  image_url text,
  video_url text,
  scenario text,
  created_at timestamptz not null default now()
);

create index if not exists project_ad_ideas_project_id_idx
  on public.project_ad_ideas (project_id);

alter table public.project_ad_ideas enable row level security;

drop policy if exists "project_ad_ideas_owner" on public.project_ad_ideas;
create policy "project_ad_ideas_owner" on public.project_ad_ideas
  for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
