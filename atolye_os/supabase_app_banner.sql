-- Atölye OS — panonun üst banner görseli
-- app_settings tablosuna app_banner_url kolonu ekler. Supabase > SQL Editor'da bir kez çalıştır.

alter table public.app_settings
  add column if not exists app_banner_url text;
