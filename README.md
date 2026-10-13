# ⚡ Pulse — Ekip İş Takip & Gerçek Zamanlı İletişim Platformu

20-25 kişilik tek bir ekibin günlük operasyonları için özel olarak tasarlanmış; ClickUp'ın hantallığından uzak, **Linear sadeliğinde** ve **0$ aylık altyapı maliyetiyle** çalışan mobil-first iş yönetim platformu.

---

## 🚀 Hızlı Başlangıç

### 1. Bağımlılıkları Yükleme
```bash
cd pulse
npm install
```

### 2. Geliştirme Sunucusunu Başlatma
```bash
npm run dev
```
Uygulamayı tarayıcınızda veya telefonunuzda açmak için `http://localhost:3000` adresine gidin.

---

## 🗄️ Veritabanı ve Supabase Kurulumu (0$ Tier)

1. [supabase.com](https://supabase.com) adresinde ücretsiz bir proje açın.
2. Dashboard'da **SQL Editor** bölümüne gidin.
3. [`supabase/schema.sql`](./supabase/schema.sql) dosyasının içeriğini yapıştırıp **Run** butonuna basın.
   - Tüm tablolar (`profiles`, `projects`, `tasks`, `chat_messages`, `notifications`, vb.)
   - Otomatik görev tamamlama bildirim tetikleyicisi (`handle_task_completion_notification`)
   - Row Level Security (RLS) politikaları anında aktif olacaktır.
4. Supabase dashboard'dan aldığınız `Project URL` ve `anon public key` değerlerini `.env.local` dosyasına ekleyin.

---

## 📱 Mobil PWA Deneyimi

- **iOS (Safari):** Paylaş (Share) butonuna basın -> **"Ana Ekrana Ekle" (Add to Home Screen)** deyin.
- **Android (Chrome):** Üç nokta menüsünden **"Uygulamayı Yükle"** deyin.
- Uygulama telefonunuzda tam ekran, alt navigasyonlu ve yerel bildirim destekli bir mobil uygulama gibi çalışır.
