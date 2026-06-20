-- Atölye OS — "Araştırılacak Konular" global görev listesi
-- Tek kullanıcı, owner-bazlı RLS. Supabase > SQL Editor'da bir kez çalıştır.

create table if not exists public.research_topics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  note text,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists research_topics_owner_idx
  on public.research_topics (owner_id);

alter table public.research_topics enable row level security;

drop policy if exists "research_topics_owner" on public.research_topics;
create policy "research_topics_owner" on public.research_topics
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
