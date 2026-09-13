# doginn — Uygulama Tanıtım Dokümanı

> **Bu dosya ne için?** doginn uygulamasını bir yapay zekâ asistanına (ChatGPT vb.) tek seferde tanıtmak için hazırlandı.
> **Kaynak:** Uygulamanın kaynak kodu, veritabanı migration'ları ve canlı veritabanındaki referans veriler (park listesi, rozetler). Tahmin içermez. Emin olunmayan noktalar açıkça işaretlendi.
> **Güncellik:** 12 Eylül 2026 · **Depo:** GitHub `Epikfailsoft/park-paws` (Lovable ile senkron)

---

## 0. Asistan için talimatlar

1. Kullanıcıyla **Türkçe** konuş. Uygulamanın arayüzü de Türkçe.
2. Bu dokümandaki bilgileri uygulamanın gerçek durumu kabul et. **"Doğrulanmalı"** veya **"olası"** diye işaretlenen maddeleri kesin bilgi gibi sunma.
3. Kod önerirken mevcut yapıya uy: React 18 + TypeScript + Tailwind/shadcn-ui + bileşenlerden doğrudan Supabase çağrıları. Yeni kütüphane önermeden önce mevcut araçlarla çözülüp çözülemeyeceğine bak.
4. Veritabanı şeması, RLS kuralları ve RPC fonksiyonları **Lovable Cloud** (yönetilen Supabase) üzerinde. Şema değişikliği gereken önerilerde bunun **Lovable üzerinden migration** olarak uygulanacağını belirt. Yalnızca arayüz değişikliği gerekenleri ayrıca vurgula.
5. İsimlendirme farklarına dikkat et: Arayüzde **"woof / havla"** olan şey kodda **`wave`**, **"Köpeğim"** rotası **`/mydog`**, **"Sosyal"** rotası **`/inbox`**. Ayrıntılar için Sözlük'e bak.

---

## 1. Tek paragrafta doginn

**doginn** ("Köpekler tanışır, sahipler buluşur") mahalle parklarında köpeklerin tanışıp birlikte oynamasını kolaylaştıran, **mobil öncelikli** bir sosyal web uygulamasıdır.
- **Profil ve keşif:** Sahipler köpeklerine ayrıntılı bir profil oluşturur (enerji, oyun tarzı, sosyallik, agresyon riski, sağlık). Yakındaki köpekleri kaydırmalı kartlarla keşfedip **woof** gönderirler.
- **Eşleşme ve mesaj:** Karşılıklı woof bir **Harmony** (eşleşme) oluşturur. Eşleşen sahipler hazır şablon mesajlarla park buluşması planlar.
- **Parkta:** Sahipler parka **check-in** yapar, **Playdate ON** ile oyuna açık olduklarını gösterir, grup buluşmaları düzenler ve park duyuru panosunu kullanır.
- **Güvenlik:** **Kayıp Modu** köpek kaybolduğunda acil telefon numarasını parktaki kullanıcılara gösterir.
- **Bölgeler:** İlk aktif bölgeler İstanbul (Arnavutköy, Bebek, Maçka) ve Muğla/Akyaka.

İsim geçmişi: **DogSpace → DOGI → doginn**. Kodda hâlâ eski izler var (`src/types/dogspace.ts`, `dogspace-input` CSS sınıfı, "DOGI" logosu).

---

## 2. Kimin için, hangi sorunu çözüyor?

| Kullanıcı | İhtiyaç | doginn'deki karşılığı |
|---|---|---|
| Köpek sahibi | Köpeğine uygun oyun arkadaşı bulmak | Keşfet'te filtreli kartlar, ayrıntılı davranış profili |
| Köpek sahibi | Parkta kimlerin olduğunu bilmek | Park check-in, canlı yoğunluk, "Parkta kim var?" |
| Köpek sahibi | Güvenli tanışma | Agresyon riski, tasmasız uyum, yavru/büyük köpek toleransı, aşı durumu |
| Köpek sahibi | Buluşma ayarlamak | Harmony + sıralı şablon mesajlar + grup woof |
| Köpeği kaybolan sahip | Hızlı yardım | Kayıp Modu: acil telefon parktaki kullanıcılara görünür |
| Köpeği olmayan meraklı | Uygulamayı gezmek | Gözlemci modu |

**Gizlilik yaklaşımı:**
- Sahipler başkalarına yalnızca "Ad S." biçiminde görünür (`owner_name_stub`).
- Telefon numarası yalnızca Kayıp Modu açıkken ve yalnızca parktaki köpek listesinde görünür.

---

## 3. Sözlük

| Kavram (arayüz) | Anlamı | Kodda / veritabanında |
|---|---|---|
| **Woof / Havla** | Bir köpeğe ilgi göndermek | `waves` tablosu, `send_wave` RPC |
| **Harmony** | Karşılıklı woof, yani eşleşme. Mesajlaşmayı açar. | `harmonies` |
| **Playdate ON/OFF** | 24 saatliğine "oyuna açığım" görünürlüğü | `dogs.playdate_on`, `playdate_expires_at`, `toggle_playdate` |
| **Park check-in (Park Mode)** | Parkta fiziksel olarak bulunmak, 4 saat geçerli | `dogs.park_checkin_active`, `park_mode_sessions`, `toggle_park_checkin` |
| **Kayıp Modu** | Kaybolan köpek için acil telefonlu alarm | `dogs.is_lost`, `dog_lost_profile`, `toggle_lost_mode` |
| **Gözlemci modu** | Köpek eklemeden uygulamayı gezmek | `profiles.observer_mode` |
| **Plus Play** | Ücretli paket: ₺99/ay, yıllıkta %30 indirim. **Henüz aktif değil.** | Arayüzde kilit ekranları, ödeme altyapısı yok |
| **Park durumu** | `ACTIVE` aktif · `REQUESTED` bekleme listesi, destek topluyor · `CLOSED` kapalı | `parks.status` |
| **Park desteği** | Bekleme listesindeki parkın açılması için kullanıcı onayı | `park_approvals`, `parks.approval_count` / `required_approvals` |
| **Grup Woof** | Parkta saatli toplu buluşma çağrısı ve katılım (RSVP) | `group_waves`, `group_wave_rsvps` |
| **Duyuru panosu** | Park bazlı duyurular: Duyuru, Kayıp/Bulundu, Etkinlik, Belediye | `park_announcements` |
| **Şablon (template) mesaj** | Eşleşme sonrası sırayla gönderilen 3 hazır mesaj | `messages.message_type = 'template'`, `template_sequence` |
| **Rozet** | Köpeğe verilen başarı işareti | `badges`, `dog_badges` |

---

## 4. Ekranlar ve kullanıcı akışları

### 4.1 Gezinme

Sabit alt menü: **Keşfet · Park · Köpeğim · Sosyal**. Oturum açmış ve köpeği olan (veya gözlemci modundaki) kullanıcıya görünür.

| Rota | Ekran | Kim erişir |
|---|---|---|
| `/` | Yönlendirme | Oturum yoksa `/auth`, köpek yoksa `/onboarding`, aksi halde `/discover` |
| `/auth` | Giriş / Kayıt | Oturumu olmayanlar |
| `/onboarding` | İlk kurulum | Oturumu olan, köpeği olmayan |
| `/discover` | Keşfet | Köpeği olan veya gözlemci |
| `/park` | Park | Köpeği olan veya gözlemci |
| `/mydog` | Köpeğim | Köpeği olan veya gözlemci |
| `/inbox` | Sosyal | Köpeği olan veya gözlemci |
| `/admin` | Yönetim paneli | `is_admin()` doğru olanlar |

Eski adresler yönlendirilir: `/messages` → `/inbox`, `/profile` → `/mydog`.

### 4.2 Giriş / Kayıt (`/auth`)
- **Sosyal giriş:** Google ve Apple ile giriş, Lovable'ın OAuth aracısı üzerinden yapılıyor. Bu yüzden **yalnızca Lovable'da yayınlanan sürümde çalışır**, yerel geliştirmede çalışmaz.
- **E-posta ile giriş:** E-posta + şifre ile giriş ve kayıt. Kayıtta doğrulama bağlantısı gönderilir. Şifre en az 6, ad en az 2 karakter olmalı.
- **Yasal metinler:** "Kullanım Koşulları" ve "Gizlilik Politikası" bağlantıları henüz boş (`#`).

### 4.3 Onboarding (`/onboarding`), 3 adım

**1. "Köpeğini Tanıyalım"**
- **Alanlar:**
  - fotoğraf (zorunlu)
  - ad
  - ırk: 195 ırklık listeden aranır; "Diğer" seçilirse melez/kırma açıklaması istenir
  - yaklaşık yaş: serbest metin, örneğin "~2 yaş" veya "6 aylık"
  - enerji: 3 seviye
  - kısırlaştırma durumu (zorunlu)
  - köken: Sahipli / Barınak / Sokak
  - acil durum telefonu (zorunlu)
- **Kaydedilince:**
  - fotoğraf depolamaya yüklenir;
  - köpek oluşturulur;
  - telefon `dog_private` ve `dog_lost_profile` tablolarına yazılır;
  - **Playdate otomatik açılır**.
- **Alternatif:** "Gözlemci olarak uygulamayı keşfet".

**2. "Parkını Seç":** Kullanıcı bir park seçer (`user_parks`).

**3. "Son Adım!":** Sahip fotoğrafı ve adı girilir. Ad düzenlenebilir.

Her adımdaki **"Atla"** düğmesi kullanıcıyı **gözlemci moduna** alır ve Keşfet'e götürür.

### 4.4 Keşfet (`/discover`)
- **Başlık:** Seçili park adı · günün zamanı ("Bu sabah / Bugün / Bu akşam") · toplam üye sayısı.
- **Görünüm seçimi:** Kartlar veya harita. **Harita Plus Play kilidi arkasında** ("Yakında aktif olacak"). Arkada Leaflet/OpenStreetMap haritası hazır.
- **Kaydırmalı kart:**
  - İçerik: fotoğraf, ad, ırk, yaş, cinsiyet, sosyallik etiketi, mesafe, "parkta" bilgisi, sahip adı ("Elif Y." gibi).
  - Düğmeler: **geç ✗**, **geri al ↺**, **woof ❤**.
  - Alt kısımda "3 / 12" gibi bir sayaç var.
- **Listeleme kuralları:**
  - Kayıp köpekler kaydırma listesinde gösterilmez.
  - Geçilen köpekler cihazda (localStorage) hatırlanır.
  - Karta dokununca ayrıntılı profil paneli açılır: oyun tarzı, burç, rozetler, sevdikleri/sevmedikleri vb.
- **Filtreler:**
  - mesafe (1 / 2 / 5 / 10 km)
  - cinsiyet
  - enerji
  - oyun tarzı
  - boyut
  - sosyallik
  - kısırlaştırma
  - barınak köpeği
  - ⚠️ Oyun tarzı, boyut ve barınak filtreleri şu an çalışmıyor (bkz. §11).
- **Veri kaynağı:**
  - `get_discover_dogs` RPC.
  - Konum izni verilirse köpeğin konumu `update_dog_location` ile güncellenir.

### 4.5 Park (`/park`)

**Şehir ve park seçimi**
- Şehirler: İstanbul, Muğla, Ankara, İzmir.
- Aktif parklar ve bekleme listesindeki parklar ayrı listelenir.
- Bekleme listesindeki bir parka **destek** verilebilir. Destek sayısı eşiğe ulaşınca park aktifleşecek şekilde tasarlanmış (⚠️ bkz. §11).
- Yeni park veya şehir talep formu var.

**Park görünümü**
- **Başlıktaki Playdate düğmesi:**
  - "Playdate ON" playdate'i ve park check-in'ini birlikte açar; "OFF" ikisini birlikte kapatır.
  - Fotoğrafı olmayan köpek görünür olamaz.
- **Canlı yoğunluk:** "N köpek parkta" ve ilk 4 köpeğin avatarı, "+N".
- **Kayıp bandı:** Parktaki kayıp köpekler.
- **"Parkta kim var?":** Check-in yapmış köpeklerin kartları, **"Havla 🐕"** düğmesi ve kısa süreli **"Geri al"**.
- **Grup Woof:** Hazır çağrılar: "Bugün 18:00 buradayım", "Sabah yürüyüş grubu", "Sessiz oyun saati". Katılım bildirilebilir.
- **Duyuru panosu:** Duyuru / Kayıp-Bulundu / Etkinlik / Belediye türleri. Duyurular raporlanabilir.
- **Süre uyarısı:** Check-in süresi dolmak üzereyken uyarı gösterilir.

### 4.6 Köpeğim (`/mydog`)

**Başlık:** logo, köpek seçici (birden fazla köpek varsa), hızlı **"Kayıp"** düğmesi, **"Düzenle"**. Kayıp Modu açıkken en üstte kırmızı bant görünür: *"Parkta aktif kullanıcılar telefon numaranı görebilir"*.

**Profil bölümleri (sırayla)**
1. **Köpek kimliği:** fotoğraf galerisi, ad, yaş, cinsiyet, kısırlaştırma, ırk, boyut/enerji, biyografi.
2. **Oyun & Uyum:** oyun tarzları (en fazla 2), sosyallik, agresyon riski, tasmasız uyum.
3. **Rutin & Koordinasyon:** aktif saatler, yürüyüş süresi, en çok gidilen park.
4. **Sağlık:** aşı durumu, son veteriner ziyareti, mikroçip, alerji/özel durum.
5. **Güvenlik detayları** (açılır kapanır): yavru toleransı, büyük köpek toleransı, oyuncak koruma, kedi uyumu.
6. **Rozetler.**
7. **Kayıp Modu:** acil telefon ve "Kayıp Modunu Aktif Et".
8. **Aksiyonlar:**
   - Profili Düzenle
   - "Mini Kart Paylaş" (şu an işlevsiz)
   - Aile: sahip adı ve fotoğrafı
   - köpek silme (birden fazla köpek varsa)
   - Çıkış Yap

**Profil düzenleme seçenekleri**

| Alan | Seçenekler (değer → etiket) |
|---|---|
| Boyut | small → Küçük · medium → Orta · large → Büyük |
| Enerji | 1 → Düşük · 2 → Orta · 3 → Yüksek |
| Oyun tarzı (en fazla 2) | chase → Kovalamaca · wrestle → Güreş / Sert oyun · toy → Oyuncak odaklı · gentle → Nazik oyun · calm_social → Sosyal ama sakin |
| Sosyallik | shy → Çekingen · selective → Seçici · everyone → Herkesle oynar |
| Agresyon riski | none → Yok · situational → Durumsal · high → Yüksek |
| Tasmasız uyum | safe → Güvenli · controlled → Kontrollü · risky → Riskli |
| Aktif saatler | morning → Sabah · noon → Öğlen · evening → Akşam |
| Yürüyüş süresi | short → Kısa (15–30 dk) · medium → Orta (30–60 dk) · long → Uzun (60+ dk) |
| Köken | none → Sahipli · shelter → Barınak · street → Sokak |
| Güvenlik soruları | yes → Evet · no → Hayır · cautious → Dikkatli |
| Aşı durumu | up_to_date → Güncel · due_soon → Yaklaşıyor · unknown → Bilinmiyor |
| Burç | 12 burç (Koç … Balık) |
| Sosyal stil (ayrı alan) | FRIENDLY → Çok Sosyal · NEUTRAL → Seçici · SELECTIVE → Mesafeli |

### 4.7 Sosyal (`/inbox`)

**Arkadaşlar:** Harmony (eşleşme) listesi.

**Mesajlar:** Eşleşmeler arasındaki sohbet. "Park Koordinasyonu" şablonları **sırayla** gönderilir:
1. "Köpekler için kısa bir playdate yapalım mı?" 🎾
2. "Hangi park size daha uygun?" 🏞️
3. "Hangi zaman aralığı daha iyi olur?" ⏰

**Serbest mesaj ve fotoğraf gönderme Plus Play'e bağlı.** Şu an hiçbir kullanıcıda açık değil.

**Aktivite:** Kayıp köpekler (tek dokunuşla arama) ve son aktivite akışı.

### 4.8 Admin (`/admin`)
`is_admin()` ile korunur. Bölümler:
- Kullanıcılar
- Parklar
- Aktivite (son 7 gün)
- Template akışı (şablon hunisi)
- "V1.3 Hazırlık" metrikleri
- Raporlanan duyurular

---

## 5. İş kuralları (sunucu tarafında zorlanan)

| İşlem | RPC | Kurallar |
|---|---|---|
| Woof gönder | `send_wave` | Yalnızca kendi köpeğinle gönderebilirsin, kendi köpeğine gönderemezsin. Aynı köpeğe **günde 1**. **1 dakikada en fazla 5** ("Çok hızlı!"). Karşı taraf daha önce woof attıysa Harmony oluşur (`HARMONY_CREATED`), yoksa `WAVED` döner. Günlük toplam woof limiti kaldırıldı; eski `daily_wave_limits` tablosu duruyor. |
| Playdate | `toggle_playdate` | Açınca **24 saat** geçerli. |
| Park check-in | `toggle_park_checkin` | **4 saat** geçerli. `park_mode_sessions` kaydı açar. |
| Kayıp modu | `toggle_lost_mode` | Açmak için acil telefon zorunlu. Biçim: `+90XXXXXXXXXX` veya `0XXXXXXXXXX`. `dog_lost_profile` ve `dog_private` güncellenir. |
| Şablon mesaj | `send_template` | Yalnızca eşleşmenin tarafları. Şablonlar **1 → 2 → 3 sırasıyla** ve her biri **bir kez**. **Günde en fazla 5 şablon.** |
| Serbest mesaj | `send_message` | Yalnızca taraflar, içerik boş olamaz. Arayüzde Plus Play kilidi var. |
| Konum | `update_dog_location` | Yalnızca köpeğin sahibi. `dogs.location` (PostGIS) güncellenir. |
| Keşfet listesi | `get_discover_dogs` | Kendi köpeklerin ve silinmişler hariç. Mesafe sınırı (varsayılan 10 km). Sıralama: kayıp → parkta → playdate açık → en yeni. |
| Parktaki köpekler | `get_park_dogs` | Giriş zorunlu. Check-in'i aktif ve süresi dolmamış köpekler, kayıplar önce. Acil telefonu **yalnızca kayıp köpekler için** döndürür. |
| Varlık bildirimi | `ping_presence` | Aktif park oturumu gerektirir. **Arayüzde kullanılmıyor.** |

**Tetikleyiciler:**
- İlk park check-in'inde rozet verilir.
- Köpek kaydındaki sahip adı ve fotoğrafı özeti (`owner_name_stub` / `owner_photo_stub`) otomatik senkronlanır.
- `profiles` ve `dogs` tablolarında `updated_at` otomatik güncellenir.

**Depolama:** Tek, herkese açık kova `dog-photos` var. Köpek, sahip ve sohbet fotoğraflarının hepsi burada.
- **Yükleme kuralı:** Dosya yolunun ilk klasörü, yükleyen kullanıcının Auth kimliği olmalı (`<auth.uid>/dogs/…`). `profiles.id` bu amaçla kullanılamaz, çünkü farklı bir UUID.
- **Yol üretimi:** Yollar `src/lib/upload-validation.ts` içindeki `photoStoragePath()` ile üretilir.

---

## 6. Veri modeli (27 tablo)

**Kullanıcı ve rol**
- `profiles`: `id` (kendi UUID'si), `user_id` (Supabase Auth kimliği; **`id` ile aynı değildir**), `display_name`, `last_name`, `photo_url`, `bio`, `observer_mode`
- `user_roles`: `user_id`, `role` (ör. `admin`)
- `user_parks`: kullanıcının seçili parkı

**Köpek**
- `dogs`
  - Temel: `owner_id` (→ `profiles.id`), `name`, `photo_url`, `breed_id`, `breed_custom_text`, `approximate_age` (metin), `gender`, `weight_kg`, `neutered`, `is_shelter`, `energy_level` (1–3), `daily_energy`, `bio`, `likes` / `dislikes` / `triggers` (etiket dizileri)
  - Davranış: `social_style` (enum), `sociality`, `play_styles` (dizi), `size_label`, `aggression_risk`, `offleash_compat`, `puppy_tolerance`, `big_dog_tolerance`, `toy_guarding`, `cat_compat`
  - Rutin: `active_hours` (dizi), `walk_duration`, `zodiac_sign`
  - Sağlık: `allergy_notes`
  - Durum: `playdate_on` / `_started_at` / `_expires_at`, `park_checkin_active` / `_started_at` / `_expires_at`, `current_park_id`, `is_lost`, `location` (PostGIS), `location_updated_at`, `deleted_at` (yumuşak silme)
  - Gizlilik: `owner_name_stub`, `owner_photo_stub`
- `breeds` (195 kayıt): `name`, `code`
- `dog_photos`: galeri (`is_primary`, `sort_order`)
- `dog_private`: `emergency_phone`, `microchip_id`, `vaccination_expiry`
- `dog_care`: aşı durumu ve tarihleri, parazit koruma tarihleri, `last_vet_visit`, `notes`
- `dog_lost_profile`: `emergency_phone`, `last_seen_park_id`, `lost_started_at`, `lost_ends_at`
- `care_documents`: sağlık belgeleri (arayüze bağlı değil)
- `badges`, `dog_badges`: rozetler
- `playdate_history`: geçmiş buluşmalar

**Sosyal**
- `waves`: `from_dog_id`, `to_dog_id`, `wave_date`
- `harmonies`: `dog_a_id`, `dog_b_id`
- `messages`: `harmony_id`, `sender_id`, `message_type` (`template` / `reply`), `template_id`, `content`
- `template_sequence`: eşleşme ve kullanıcı bazında gönderilen şablonlar
- `daily_wave_limits`: eski günlük woof limiti (artık kullanılmıyor)

**Park**
- `parks`: `name`, `status` (`CLOSED` / `REQUESTED` / `ACTIVE`), `location` (JSON: şehir + koordinat), `required_approvals`, `approval_count`, `is_beta`, `activated_at`, `requested_by`
- `park_approvals`, `park_requests`: destek ve talepler
- `park_mode_sessions`, `presence_pings`: park oturumları ve varlık bildirimleri
- `group_waves` (`template`, `scheduled_time`, `expires_at`), `group_wave_rsvps`: grup woof
- `park_announcements`: `announcement_type`, `title`, `body`, `pinned`, `expires_at`, `report_count`

**Sistem**
- `notifications`: `type`, `payload`, `park_id`
- `events`: analitik olayları (`event_name`, `payload`)

**Enum'lar:** `park_status` = CLOSED / REQUESTED / ACTIVE · `social_style_type` = FRIENDLY / NEUTRAL / SELECTIVE · `message_type` = template / reply

---

## 7. Güncel referans veriler

**Parklar**

| Park | Şehir | Durum |
|---|---|---|
| Arnavutköy Parkı | İstanbul | Aktif |
| Bebek Parkı | İstanbul | Aktif |
| Maçka Parkı | İstanbul | Aktif |
| Akyaka Küçük | Muğla | Aktif |
| Akyaka Sahil | Muğla | Aktif |
| Bodrum Parkı | Muğla | Bekleme listesi |
| Fuar Parkı | İzmir | Bekleme listesi |
| Kordon | İzmir | Bekleme listesi |
| Kuğulu Park | Ankara | Bekleme listesi |
| Seğmenler Parkı | Ankara | Bekleme listesi |

**Rozetler (veritabanında)**
- 🏅 Kurucu Köpek: pilot bölgedeki ilk kullanıcılardan
- 🤝 Harmony Serisi: aynı parkta düzenli buluşmalar
- 🎯 En İyi Oyun Arkadaşları: en çok playdate yapan ikili
- 🌳 Park Müdavimi: düzenli park ziyaretleri
- 🦋 Sosyal Kelebek: 10+ farklı köpekle harmony
- 🏞️ İlk Park Girişi: ilk park check-in'i

> Not: Köpeğim ekranındaki rozet listesi kodda sabit yazılmış ve veritabanıyla eşleşmiyor. Arayüzde "Süper Oyuncu", "Güvenilir Dost", "Park Yıldızı", "Yavru Dostu" var; bunlar veritabanında yok (bkz. §11).

---

## 8. Teknik mimari

- **Tür:** Tek sayfa web uygulaması (SPA), mobil öncelikli. **Ayrı bir backend sunucusu yok.**
- **Frontend:**
  - Vite 5, React 18, TypeScript, React Router 6
  - Tailwind CSS 3 + shadcn/ui (Radix)
  - lucide-react ikonları, sonner bildirimleri
  - react-hook-form + zod, date-fns
  - Leaflet + react-leaflet 4
  - TanStack Query (kurulu ve sağlayıcısı tanımlı ama hiçbir yerde kullanılmıyor)
- **Backend:** Lovable Cloud (yönetilen Supabase):
  - Postgres + RLS (satır düzeyi güvenlik)
  - PostGIS (mesafe hesabı)
  - `SECURITY DEFINER` PL/pgSQL RPC fonksiyonları
  - Supabase Auth ve Storage
- **Veri erişimi:** Bileşenlerden doğrudan `supabase.from(...)` ve `supabase.rpc(...)` çağrılıyor. Global durum `AuthProvider` içinde: `user`, `profile`, `dogs`, `selectedPark`, gözlemci modu. Keşfet listesi sessionStorage'da önbelleğe alınıyor.
- **Klasör yapısı:**
  - `src/pages`: ekranlar (Auth, Onboarding, Discover, Park, Profile, Messages, Admin)
  - `src/components/{discover,park,profile,social,shared,cards,layout,ui}`
  - `src/hooks`: `useAuth`, `useLocation`
  - `src/integrations/supabase`: **otomatik üretilen** istemci ve tipler (elle düzenlenmez)
  - `src/lib`: `utils`, `turkish.ts` (Türkçe ek yardımcıları)
  - `src/types/dogspace.ts`: tipler ve sabitler
  - `src/dev`: yerel demo modu
  - `supabase/migrations`: veritabanı geçmişi
- **Test ve kalite:** Vitest + Testing Library, ESLint.

---

## 9. Tasarım sistemi

- **Marka:** doginn · Slogan: "Köpekler tanışır, sahipler buluşur."
- **Renkler:**
  - Park Yeşili `#4CAF6B` (primary)
  - Gökyüzü `#7EC8F3`
  - Krem `#FFF6E8` (arka plan)
  - Kömür `#333333` (secondary)
  - Sıcak Turuncu `#FF8A3D` (accent / harmony)
- **Sayfa renkleri:** Keşfet turuncu, Park koyu yeşil, Köpeğim kömür, Sosyal yeşil başlık.
- **Yazı tipleri:** Nunito (başlıklar), Inter (metin).
- **Token kuralı:**
  - `bg-secondary` koyu (kömür) zemindir, üstünde `text-secondary-foreground` kullanılır.
  - Açık yüzeyler için `bg-muted` kullanılır.
- **Yerleşim:** Mobil öncelikli. İçerik en fazla ~448 px genişlikte, alt menü sabit.
- **Dil:** `lang="tr"`. Köpek isimlerine ek getirirken ses uyumuna göre ek üreten `accusative()` ("Pamuk'u") ve `genitive()` ("Pamuk'un") kullanılır.

---

## 10. Geliştirme süreci

- **Lovable ↔ GitHub `main` iki yönlü senkron:**
  - GitHub'a gönderilen her şey Lovable'a yansır, Lovable'daki değişiklikler de GitHub'a gelir.
  - Aynı anda iki yerde düzenleme yapılmamalı.
- **Paketler:**
  - Lovable bun kullanır, esas kilit dosyası `bun.lock`.
  - Yerelde npm kullanılır (`npm ci`).
  - Bağımlılık değişince `bun.lock` da güncellenmeli.
- **Komutlar:** `npm run dev` (port 8080), `npm run build`, `npm test`, `npm run lint`.
- **Yerel demo modu:**
  - `.env.local` dosyasına `VITE_DEMO_MODE=true` yazılınca giriş atlanır ve iki köpekli bir demo sahibiyle açılır.
  - Keşfet ve Park örnek köpeklerle dolar.
  - Veritabanına yazma istekleri tarayıcıda engellenir.
  - Yalnızca geliştirme sunucusunda çalışır, canlı sürüme girmez.
- **Kısıtlar:**
  - Yerel uygulama **canlı veritabanına** bağlıdır.
  - Google/Apple girişi yerelde çalışmaz.
  - Şema/RLS/RPC değişiklikleri Lovable'dan yapılır.

---

## 11. Mevcut durum ve bilinen sorunlar (12 Eylül 2026)

### Son yapılan düzeltmeler
Bunlar yerelde commit edildi, **henüz yayınlanmadı**:
- **Kritik:** 26 Nisan 2026'dan beri tüm fotoğraf yüklemeleri depolama kuralına takılıyordu, bu yüzden yeni kullanıcılar köpek ekleyemiyordu. Yükleme yolları artık kullanıcının Auth kimliğiyle başlıyor.
- Harita bileşeni React 18'de çöküyordu: react-leaflet 5'ten 4'e geçildi.
- Nunito/Inter fontları hiç yüklenmiyordu: CSS import sırası düzeltildi.
- `lang="tr"` ayarlandı; büyük harfler artık "AİLE" gibi doğru.
- Köpek isimlerindeki ek hataları düzeltildi ("Pamuk'i" → "Pamuk'u").
- Koyu zeminde koyu yazı kalan yaklaşık 25 yer düzeltildi; giriş ekranı sekme kontrastı düzeltildi.
- Köpeğim başlığı dar telefonlarda taşıyordu, düzeltildi.
- Kayıt yokken 406 hatası veren sorgular düzeltildi.
- Yerel demo modu eklendi.

### Açık sorunlar

| # | Önem | Sorun | Kanıt / not | Çözüm yönü |
|---|---|---|---|---|
| 1 | ✅ Düzeltildi (yerelde) | **Fotoğraf yüklemeleri reddediliyordu.** 26 Nisan 2026'dan beri depolama kuralı yolun kullanıcının Auth kimliğiyle başlamasını istiyordu, uygulama başka yollar kullanıyordu. Yeni kullanıcılar köpek ekleyemiyordu: o tarihten beri yeni profil var ama 0 yeni köpek. | Yollar artık `photoStoragePath()` ile `<auth.uid>/…` biçiminde. | Yayına alındıktan sonra gerçek bir fotoğraf yüklemesiyle doğrulanmalı. |
| 2 | 🟠 Yüksek | **Park desteği sayacı artmıyor (olası).** Destek, tarayıcıdan `parks.approval_count` güncellenerek sayılıyor; 26 Nisan'dan beri `parks` güncellemesi yalnızca adminlere açık. Güncelleme sessizce başarısız olur, park hiç aktifleşmez. Kullanıcı yine de "Desteğin kaydedildi" mesajı görür. | RLS kurallarına göre. Canlıda doğrulanmalı. | Sayacı veritabanında trigger veya RPC ile artırmak (Lovable migration). |
| 3 | 🟠 Yüksek | **Keşfet'te oyun tarzı / boyut / barınak filtreleri tüm köpekleri eliyor.** `get_discover_dogs` bu alanları döndürmüyor. | Canlı veritabanında doğrulandı. | RPC'ye sütun eklemek (migration) ya da `dogs` tablosundan istemcide birleştirmek. |
| 4 | 🟠 Yüksek | **İkinci köpek eklenemiyor.** "Köpek Ekle" Onboarding'e gidiyor, Onboarding köpeği olan herkesi Keşfet'e geri yolluyor. | Kodda doğrulandı. | İkinci köpek için yalnızca "köpek" adımını gösteren bir akış (ürün kararı gerekli). |
| 5 | 🟡 Orta | **Serbest mesaj herkese kapalı.** `isPlusPlay` sabit `false`, abonelik sistemi yok. | Kodda doğrulandı. | Plus Play aboneliği (Stripe planlanıyor) veya geçici olarak açmak. |
| 6 | 🟡 Orta | **Rozetler uyuşmuyor.** Arayüzdeki liste sabit kodlu, veritabanındakilerle eşleşmiyor. | Kodda ve veride doğrulandı. | Rozetleri `badges` tablosundan okumak. |
| 7 | ⚪ Düşük | Çeşitli: park kartlarında iç içe düğme; "Mini Kart Paylaş" işlevsiz; enerji etiketleri ekranlar arasında farklı (Sakin/Normal/Enerjik ↔ Düşük/Orta/Yüksek); `social_style` ile `sociality` alanları örtüşüyor; 14 kullanılmayan bileşen; ana JS paketi ~927 kB, logo PNG ~748 kB; yasal metin bağlantıları boş. | — | Temizlik ve iyileştirme. |

### Yol haritası (Lovable planından ve koddan)
- **Yapıldı:**
  - sınırsız woof
  - giriş ekranında sosyal düğmeler üstte
  - harita için yer tutucu ve Plus Play kilidi
  - çoklu köpek görüntüleme
- **Yarım kaldı:**
  - çoklu köpek **ekleme** (#4)
  - filtre senkronizasyonu (#3)
- **Sonraki adımlar:**
  - Plus Play / Supporter paketleri ve Stripe ödeme entegrasyonu
  - üreme (breeding) filtresine ücretli erişim
  - Admin panelindeki "V1.3" hazırlığı

---

## 12. Bu dokümanla asistandan neler istenebilir?

- "§11'deki Keşfet filtre sorununu migration gerektirmeden nasıl çözerim?"
- "Park desteği sayacı için güvenli bir Supabase RPC ve migration SQL'i yaz."
- "Plus Play aboneliğini Stripe ile bu veri modeline uygun şekilde nasıl kurgularım?"
- "Keşfet için köpek profillerine dayalı bir 'uyumluluk skoru' tasarla."
- "İkinci köpek ekleme akışını kullanıcı deneyimi açısından tasarla."
- "doginn için App Store açıklaması, sosyal medya metni veya yatırımcı sunumu taslağı yaz."
