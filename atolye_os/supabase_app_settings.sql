-- Atölye OS — uygulama geneli ayarlar (marka logosu vb.)
-- Tek kullanıcı, owner-bazlı RLS. Supabase > SQL Editor'da bir kez çalıştır.

create table if not exists public.app_settings (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  brand_logo_url text,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_owner" on public.app_settings;
create policy "app_settings_owner" on public.app_settings
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
