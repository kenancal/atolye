-- Atölye OS — proje sabitleme (pin) özelliği
-- projects tablosuna pinned kolonu ekler. Supabase > SQL Editor'da bir kez çalıştır.

alter table public.projects
  add column if not exists pinned boolean not null default false;
