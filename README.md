# ⚡ Pulse — Mobil İş ve Proje Yönetim Sistemi (v2.0)

Tek bir ekibin günlük operasyonları için özel olarak tasarlanmış; **Linear sadeliğinde**, mobil öncelikli (iOS ve Android PWA) ve **0$ aylık ek altyapı maliyetiyle** çalışan entegre iş, görev, takvim ve iletişim platformu.

---

## ✨ Öne Çıkan Özellikler (10 Mobil Ekran)

1. **Kişisel Sayfa (Ana Ekran):** Açılışta doğrudan kişisel görev akışı. Gelişmiş zaman filtreleri (Bu Hafta, Önümüzdeki Hafta, Bu Ay, Geçmiş, Hepsi) ve tamamlanma durumu filtreleri.
2. **Dokunma Hareketleri:**
   - **Tek Dokunuş:** Görev düzenleme ekranını açar.
   - **Çift Dokunuş:** Görevi anında tamamlar / üzerini çizer ve *"Geri Al"* bildirimi sunar.
3. **Görev Düzenleme:** Çoklu kişi ataması, `Kategori > Liste` hiyerarşisi, bağımsız görev renk paleti ve yerleşik yorum akışı.
4. **Kategoriler ve Modüler Listeler:** Açık uçlu kategori yönetimi. Her liste için bağımsız modül anahtarları:
   - `To do` (Görev Takibi)
   - `Dokümantasyon` (Hafif Markdown not defteri)
   - `Dosyalar` (Görsel ve dosya ekleri)
   - `Kanban` (Sütun bazlı görev panosu)
   - `Gantt` (Zaman çizelgesi ve çift dokunarak düzenleme)
   - `Liste Sohbeti` (Listeye özel mesajlaşma)
5. **Kanban & Gantt Senkronizasyonu:** Görev rengi her iki görünümde de ortaktır.
6. **Sıfır Maliyetli Gantt PDF Çıktısı:** İstemci tarafında çalışan ve uzun projeleri yatay düzende sayfalandıran PDF indirme fonksiyonu.
7. **Genel Takvim & Veri Maskeleme:** Ay, Hafta ve Gün görünümleri. Ekip üyelerine özel emoji ve renkler. Takvim gizliliği sayesinde, izin verilmeyen liste veya açıklama detayları SQL seviyesinde maskelenir.
8. **Ekip & 3 Seviyeli Yetkilendirme:**
   - `1. Seviye (Genel Yönetici):` Tüm işleri ve listeleri yönetir.
   - `2. Seviye (Liste Yönetimi):` Sorumlu olduğu listeleri yönetir.
   - `3. Seviye (Sadece Atananlar):` Yalnızca kendisine atanan işleri görür; gerektiğinde harici yükleniciler için modül bazlı ek yetki verilebilir.
9. **Sohbet & Arşiv:** İş sohbetleri, birebir kişisel mesajlar ve silme yerine güvenli arşivleme altyapısı.
10. **Mobil PWA & Çevrimdışı Önbellek:** İnternet kesildiğinde son görevleri salt okunur sunan hafif PWA önbellek mekanizması.

---

## 🚀 Hızlı Başlangıç

### 1. Bağımlılıkları Yükleme
```bash
cd pulse
npm install
```

### 2. Veritabanı ve Supabase Kurulumu
1. Supabase SQL Editor üzerinden [`supabase/schema.sql`](./supabase/schema.sql) dosyasını çalıştırın.
2. Yeni v2 gereksinimleri için [`supabase/v2-requirements-migration.sql`](./supabase/v2-requirements-migration.sql) dosyasını çalıştırın.
3. `.env.local` dosyasında Supabase URL ve Anon Key tanımlarınızın bulunduğundan emin olun:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Geliştirme Sunucusunu Başlatma
```bash
npm run dev
```
Uygulamaya tarayıcınızdan `http://localhost:3000` adresinden erişebilirsiniz.

### 4. Üretim Derlemesi (Build)
```bash
npm run build
```

---

## 📱 Mobil Kurulum (PWA)

- **iOS (Safari):** Paylaş butonuna dokunun -> **"Ana Ekrana Ekle" (Add to Home Screen)** deyin.
- **Android (Chrome):** Menüden **"Ana Ekrana Ekle"** veya **"Uygulamayı Yükle"** deyin.
- Uygulama, tam ekran mobil görünüm ve yerel haptik/bildirim desteğiyle çalışır.
