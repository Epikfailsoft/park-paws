
## Ücretsiz Özellikler Implementasyon Planı

### 1. Auth Ekranı Düzeni
- Google/Apple butonlarını "Giriş Yap veya Kaydol" başlığının üstüne taşı
- Email/şifre formunu alta al

### 2. Unlimited Waves
- `send_wave` RPC'deki günlük 5 limit kontrolünü kaldır (migration)
- `WaveLimitModal` bileşenini kaldır veya devre dışı bırak
- UI'dan kalan wave sayacını temizle

### 3. Profil Sayfası (Köpeğim) İyileştirmeleri
- Sahip fotoğrafını üst kısımda büyük göster + değiştirilebilir yap
- Onboarding'deki tüm alanları profil sayfasıyla senkronize et
- Görsel iyileştirme (daha temiz layout, tutarlı kartlar)

### 4. Çoklu Köpek Desteği
- Profil sayfasına köpek seçici (tab/dropdown) ekle
- "+" butonu ile yeni köpek ekleme akışı
- Keşfet ve Park'ta aktif köpek seçimi

### 5. Filtre Senkronizasyonu
- Keşfet filtrelerini köpek bilgileriyle eşleştir (oyun tarzı, agresyon, tasmasız uyum, boyut)
- `get_discover_dogs` RPC'ye yeni filtre parametreleri ekle

### 6. Park Sayfası Düzeni
- 4 aktif park: İstanbul'dakiler + Muğla Akyaka Küçük + Akyaka Sahil
- Diğer parkları "Park/Rota eklemek istiyorum" formu olarak göster
- Mevcut park verilerini güncelle

### 7. Harita Görünümü (Placeholder)
- Leaflet/OpenStreetMap ile basit harita bileşeni
- "Plus Play ile erişilebilir" paywall overlay'i (şimdilik sadece UI)

### 8. Match Sonrası Profil Görüntüleme
- Harmony (match) olan köpeklerin profil sayfası görüntülenebilir olsun

---
**Kapsam dışı (sonraki adım):** Stripe entegrasyonu, Plus Play/Supporter paketleri, breeding filtresi paywall'ı
