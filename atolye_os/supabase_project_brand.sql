-- Atölye OS — "Marka & Domain" sekmesi için tablo
-- Supabase > SQL Editor'da bu içeriği kopyalayıp bir kez çalıştır.
-- Her projenin tek bir marka kaydı olur (project_id unique).

create table if not exists public.project_brand (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  domain text,
  domain_status text not null default 'Araştırılıyor',
  slogan text,
  primary_color text,
  notes text,
  updated_at timestamptz not null default now()
);

-- RLS: diğer tablolarla aynı mantık (anon role'üne açık).
alter table public.project_brand enable row level security;

drop policy if exists "project_brand_anon_all" on public.project_brand;
create policy "project_brand_anon_all"
  on public.project_brand
  for all
  to anon
  using (true)
  with check (true);
