# doginn

"Köpekler tanışır, sahipler buluşur."
Mahalle parklarında köpeklerin tanışmasını sağlayan mobil-first sosyal utility.
Türkçe arayüz. Pilot bölge: Bostanlı / Karşıyaka, İzmir.

## Teknik gerçekler — bunlara uy
- Vite 5 + React 18 + TypeScript + Tailwind 3 + shadcn/ui (Radix)
- React Router 6, Leaflet + react-leaflet 4 (5 değil, React 18'de çöküyor)
- Backend: **Lovable Cloud** (yönetilen Supabase). Postgres + RLS + PostGIS +
  SECURITY DEFINER RPC'ler
- Veri erişimi: bileşenlerden doğrudan `supabase.from()` / `supabase.rpc()`.
  TanStack Query kurulu ama kullanılmıyor — yeni yerlerde de kullanma
- Global durum: `AuthProvider` (user, profile, dogs, selectedPark, observer mode)

## KRİTİK KISITLAR
1. **Migration uygulayamazsın.** Şema, RLS ve RPC değişiklikleri Lovable
   üzerinden yapılıyor. SQL'i `supabase/migrations/` altına yaz ve bana
   "bunu Lovable'da uygula" de. Kendin uygulamaya çalışma.
2. **Lovable ↔ GitHub main çift yönlü senkron.** Aynı anda iki yerde düzenleme
   yapılamaz. Çalışmaya başlamadan önce bana Lovable'ın kapalı olduğunu sor.
3. `src/integrations/supabase/` **otomatik üretiliyor**, elle düzenleme.
4. Paket yöneticisi: Lovable bun kullanıyor, `bun.lock` esas kilit dosyası.
   Yerelde npm. Bağımlılık değişirse ikisi de güncellenmeli.
5. `profiles.id` ile `profiles.user_id` **farklı UUID'ler**. Depolama yolları
   `auth.uid()` ile başlamak zorunda — `photoStoragePath()` kullan.

## İsimlendirme
Arayüzde "woof/havla" → kodda `wave` · "Köpeğim" → `/mydog` · "Sosyal" → `/inbox`

## BİLGİ MİMARİSİ (kilitli)
Alt sekmeler: **Bugün · Keşfet · Parklar · Sosyal**
Köpeğim alt sekme değil — sağ üst avatardan açılır.

| Ekran | Cevapladığı soru |
|---|---|
| Bugün | Köpeğimle bugün ne oluyor? |
| Keşfet | Kimlerle tanışabiliriz? |
| Parklar | Nereye gidebiliriz? |
| Sosyal | Kimlerle bağ kurduk? |
| Köpeğim | Maya kim, kayıtları neler? |

## BUGÜN EKRANI KURALLARI (kilitli)
- Her kart üç sınıftan biri olmak zorunda:
  **NOW** (şimdi yapılabilecek eylem) · **NEXT** (yaklaşan şey) ·
  **STATUS** (anlamlı kısa özet)
- Bu üçüne girmeyen hiçbir şey Bugün'e giremez
- **Verisi olmayan kart hiç render edilmez.** İskelet yok, "henüz veri yok"
  yazısı yok, sıfır değerli kart yok
- En fazla 6 kart. Sonsuz kaydırma yok
- Başka köpeklerin içeriği, haber, sponsorlu içerik, "sana özel öneriler" yok
- Uydurma sayı yok. Veri yoksa kart yok

## ÜRÜN KURALLARI
- Köpek ana nesne, sahip ikincil ("Selin A." + küçük foto)
- Net GPS pini yok, görünürlük park düzeyinde
- Harmony olmadan mesaj kanalı açılmaz
- Sahip cinsiyeti/yaşı ile filtreleme YOK
- Üreme (breeding) filtresi YOK — kalıcı reddedilmiş karar
- Boost, token, öne çıkarma YOK
- Yüzde uyum skoru YOK — gerekçe cümleleri ("Benzer enerji")
- Zaman ifadeleri yumuşak: "son 2 saatte aktifti"
- Boş durum dili: "empty" değil "calm". "Şu an sakin 🌿"

## BU FAZDA YAPILMAYACAKLAR
Plan to Go · rotalar · Activity Memory · Packs · Events · marketplace ·
serbest mesaj · Plus Play · ödeme · kişilik testi · iOS build ·
React Native geçişi · kapsamlı tasarım yenilemesi

Yeni özellik önerisi gelirse: yukarıdaki mimariye uymuyorsa reddet.

## ÇALIŞMA BİÇİMİ
- Tek seferde tek görev
- Migration gerekiyorsa SQL'i göster, uygulamayı bana bırak
- Her görev sonunda "nasıl doğrularım" adımını yaz
- Emin olmadığın yerde dur ve sor
