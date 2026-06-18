# Atölye OS — Devir / Kurulum Notu

Bu dosya, projeye **başka bir bilgisayardan** (ör. evdeki masaüstü) devam etmek için gereken her şeyi içerir. Supabase arka ucu bulutta olduğu için iki makine de aynı veritabanını kullanır — veri taşımana gerek yok, sadece kodu ve `.env.local`'i taşıman yeterli.

## Teknoloji
React 19 + Vite 8 + Supabase. Tek sayfalık pano; ana mantık `src/App.jsx` içinde (büyük tek bileşen).

## Dosyaları diğer PC'ye taşıma seçenekleri
- **Önerilen — Git:** Bu klasörde henüz git yok. Burada `git init && git add . && git commit -m "ilk"` yapıp GitHub'a (private repo) gönder; diğer PC'de `git clone`. `.gitignore` zaten `node_modules` ve `*.local`'i hariç tutuyor.
- **Hızlı yol:** Klasörü olduğu gibi kopyala (USB/bulut), ama `node_modules` klasörünü kopyalama (büyük ve gereksiz) — yeni makinede yeniden kurulur.

## Yeni makinede kurulum
1. Node.js kurulu olsun (LTS yeter).
2. Proje klasöründe: `npm install`
3. `.env.local.example` dosyasını `.env.local` olarak kopyala. İçindeki iki değer zaten dolu:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (bu istemci/publishable anahtardır; tarayıcıya gitmesi normaldir, veriyi RLS korur)
4. `npm run dev` → tarayıcıda aç.

## Mevcut durum (son oturum)
Çalışan 7 detay sekmesi: Genel Bakış, Görevler, Bütçe, Dosyalar, Notlar, Marka & Domain, Rakipler, Yol Haritası. Her biri kendi Supabase tablosuna bağlı (Bütçe hariç — mevcut alanlardan hesaplanır).

Eklenen özellikler: proje silme, asset (logo/banner/dosya) yüklerken ve silerken storage temizliği, e-posta+şifre ile giriş (`Login.jsx` + `AuthGate.jsx`), üst barda "Çıkış".

## Supabase SQL dosyaları (panelde bir kez çalıştırılır)
Repo kökündeki `supabase_*.sql` dosyaları. Tablolar muhtemelen zaten kurulu; **yeni** bir Supabase projesine geçmedikçe tekrar çalıştırman gerekmez:
- `supabase_project_tasks.sql`, `supabase_project_notes.sql`, `supabase_project_roadmap.sql`,
  `supabase_project_files.sql`, `supabase_project_competitors.sql`, `supabase_project_brand.sql`

## ⚠️ Yarım kalan iş — Auth/RLS kilitleme
`supabase_auth_migration.sql` 4 aşamalı bir runbook'tur. Eğer tüm aşamaları **henüz çalıştırmadıysan**, veritabanı hâlâ herkese açık (anon) politikalarla çalışıyor. Sıra:
1. Aşama 1 (projects'e `owner_id` ekle) — SQL.
2. Supabase → Authentication → Email'de "Confirm email"i kapat (pratik için).
3. Uygulamada "Kayıt ol" ile hesabını oluştur (`kenancal@yandex.com.tr`), giriş yap.
4. Aşama 2 (mevcut projeleri sana bağla) — SQL.
5. Aşama 3 + 4 (anon politikaları kaldır, owner-bazlı RLS + storage politikaları) — SQL.
6. Supabase → Authentication → yeni kayıtları kapat.

## Sonraki olası işler
- Auth/RLS kilitlemesini tamamla (yukarıdaki adımlar).
- Marka logosunu `localStorage` yerine Supabase'e taşı.
