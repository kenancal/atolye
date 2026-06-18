-- =====================================================================
-- Atölye OS — Auth + owner-bazlı RLS migrasyonu
-- E-posta+şifre, tek kullanıcı (sadece sen).
--
-- ÖNEMLİ: Adımları SIRAYLA çalıştır. Aşama 2'yi çalıştırmadan önce
-- uygulamadan bir hesap oluşturup giriş yapmış olman gerekir,
-- yoksa mevcut projeler sahipsiz kalır ve görünmez olur.
-- =====================================================================


-- ---------------------------------------------------------------------
-- AŞAMA 1 — ŞİMDİ çalıştır (frontend'i açmadan önce)
-- projects tablosuna owner_id ekler. Yeni kayıtlar otomatik olarak
-- giriş yapan kullanıcıya bağlanır. Politikalar henüz değişmez.
-- ---------------------------------------------------------------------

alter table public.projects
  add column if not exists owner_id uuid references auth.users (id) default auth.uid();


-- ---------------------------------------------------------------------
-- ARA ADIM (SQL değil):
--   1. Frontend'i çalıştır (npm run dev).
--   2. Giriş ekranında "Kayıt ol" ile hesabını oluştur
--      (e-posta: kenancal@yandex.com.tr) ve giriş yap.
--   3. Sonra AŞAMA 2'ye geç.
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- AŞAMA 2 — Hesabını oluşturduktan SONRA çalıştır
-- Mevcut (sahipsiz) projeleri senin hesabına bağlar.
-- ---------------------------------------------------------------------

update public.projects
set owner_id = (select id from auth.users where email = 'kenancal@yandex.com.tr')
where owner_id is null;


-- ---------------------------------------------------------------------
-- AŞAMA 3 — En son çalıştır (kilitleme)
-- Tüm "anon" (herkese açık) politikaları kaldırır ve yerine
-- yalnızca giriş yapan sahibe izin veren politikalar koyar.
-- ---------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'projects', 'project_tasks', 'project_notes', 'project_roadmap',
        'project_files', 'project_competitors', 'project_brand'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- projects: sahip = giriş yapan kullanıcı
create policy "projects_owner" on public.projects
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Alt tablolar: erişim, bağlı projenin sahibine göre belirlenir
create policy "project_tasks_owner" on public.project_tasks
  for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "project_notes_owner" on public.project_notes
  for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "project_roadmap_owner" on public.project_roadmap
  for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "project_files_owner" on public.project_files
  for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "project_competitors_owner" on public.project_competitors
  for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "project_brand_owner" on public.project_brand
  for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));


-- ---------------------------------------------------------------------
-- AŞAMA 4 — Storage (Dosyalar/logo/banner yüklemeleri için)
-- Uygulama artık giriş yapmış kullanıcı olarak istek attığından,
-- project-assets bucket'ına authenticated erişim politikası gerekir.
-- ---------------------------------------------------------------------

drop policy if exists "project_assets_auth_all" on storage.objects;
create policy "project_assets_auth_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'project-assets')
  with check (bucket_id = 'project-assets');

-- Herkese açık okuma (getPublicUrl ile görsellerin görünmesi için)
drop policy if exists "project_assets_public_read" on storage.objects;
create policy "project_assets_public_read" on storage.objects
  for select to anon
  using (bucket_id = 'project-assets');
