## Ostim Tech - Google Developer Groups Hackathon '26   04-05.04.2026 


# CodeX HealthCare

Kullanıcı odaklı bir **sağlık asistanı web uygulaması**: ilaç ve laboratuvar raporu analizi, şüphe taraması, takvim hatırlatmaları, yakındaki sağlık kuruluşları (harita), oyunlar ve profil yönetimi. Bu depo, **frontend (React)** ve **backend (Node.js API)** ile **MySQL** veritabanını içerir.

> **Önemli:** Uygulama bilgilendirme ve eğitim amaçlıdır; tıbbi teşhis veya tedavi yerine geçmez. Acil durumlarda **112**’yi arayın.

---

## İçindekiler

- [Öne çıkan özellikler](#öne-çıkan-özellikler)
- [Teknoloji yığını](#teknoloji-yığını)
- [Harici servisler ve API’ler](#harici-servisler-ve-apiler)
- [Proje yapısı](#proje-yapısı)
- [Veritabanı](#veritabanı)
- [Gereksinimler](#gereksinimler)
- [Yerel geliştirme](#yerel-geliştirme)
- [Üretim ortamı (özet)](#üretim-ortamı-özet)
- [Ortam değişkenleri](#ortam-değişkenleri)
- [Dokümantasyon](#dokümantasyon)

---

## Öne çıkan özellikler

| Alan | Açıklama |
|------|-----------|
| Kimlik | Kayıt / giriş, JWT ile oturum |
| İlaç | Metin veya görüntü ile arama / analiz (Gemini) |
| Laboratuvar | PDF/görüntü rapor yükleme ve yapay zekâ özeti |
| Tarama | Veritabanından senaryolu şüphe taraması |
| Takvim | Kullanıcı etkinlikleri; e-posta + isteğe bağlı Expo push hatırlatmaları |
| Bildirim | SMTP (Nodemailer), cron (İstanbul saati), Expo push token kaydı |
| Harita | OpenStreetMap + Leaflet; Overpass ile yakın hastane/eczane |
| Nöbetçi eczane | Üçüncü taraf site gömülü görünüm (`eczaneler.gen.tr`) |
| Oyunlar | Skor kaydı ve geçmiş |
| Konum | HTTPS’te GPS; aksi halde IP tabanlı yaklaşık konum servisleri |

---

## Teknoloji yığını

### Diller

- **JavaScript (ES modules)** — frontend
- **JavaScript (CommonJS)** — backend
- **SQL (MySQL / MariaDB uyumlu)** — şema ve migrasyonlar
- **HTML / CSS** — giriş noktası, Tailwind ile üretilen stiller

### Frontend

| Teknoloji | Kullanım |
|-----------|----------|
| **React 19** | Arayüz bileşenleri |
| **Vite 8** | Derleme, dev sunucu, HMR |
| **Tailwind CSS 4** | Utility-first stil |
| **Axios** | HTTP istemcisi (REST API) |
| **lucide-react** | İkon seti |
| **Google Fonts** | Manrope, Inter, Material Symbols |

### Backend

| Teknoloji | Kullanım |
|-----------|----------|
| **Node.js** | Çalışma ortamı |
| **Express 5** | HTTP API, middleware, dosya yükleme |
| **mysql2** | MySQL bağlantı havuzu, async sorgular |
| **jsonwebtoken** | JWT üretimi ve doğrulama |
| **bcryptjs** | Parola hash |
| **multer** | Multipart (rapor / ilaç görüntüsü) |
| **dotenv** | Ortam değişkenleri |
| **cors** | Çapraz köken istekleri |
| **@google/generative-ai** | Google Gemini ile metin/görüntü analizi |
| **nodemailer** | SMTP ile hatırlatma e-postaları |
| **node-cron** | Zamanlanmış görevler (hatırlatma döngüsü) |
| **luxon** | Tarih/saat (İstanbul saat dilimi) |

### Harita ve medya (istemci)

- **Leaflet 1.9** (CDN) — interaktif harita
- **OpenStreetMap** karosu — harita görüntüleri

---

## Harici servisler ve API’ler

| Servis | Ne için |
|--------|---------|
| **Google Gemini** | İlaç, rapor, tarama yorumları (backend) |
| **Gmail SMTP** (veya uyumlu SMTP) | Hatırlatma e-postaları |
| **Expo Push API** | Mobil anlık bildirim (token kayıtlı cihazlara) |
| **Overpass API** (`overpass-api.de`) | OSM’den yakın POI sorguları |
| **ipwho.is / geojs.io** | Yaklaşık konum (HTTPS istemci tarafı) |
| **eczaneler.gen.tr** | Nöbetçi eczane iframe gömülebilir içerik |

Üretimde bu servislerin erişilebilir olması ve mümkünse **HTTPS** kullanılması önerilir.

---

## Proje yapısı

```
CodeX-HealthCare/
├── frontend/                 # React + Vite
│   ├── public/               # Statik dosyalar (logo.jpeg, favicon, .htaccess)
│   ├── src/
│   │   ├── App.jsx           # Ana uygulama ve rotalar (sekme bazlı)
│   │   ├── config.js         # VITE_API_URL taban adresi
│   │   └── components/       # Alt bileşenler (takvim, oyunlar, nöbetçi embed vb.)
│   ├── index.html
│   └── package.json
├── backend/
│   ├── server.js             # Express uygulaması ve REST uçları
│   ├── lib/notify/           # Mail, Expo push, hatırlatma işçisi
│   ├── scripts/              # Yardımcı Node scriptleri
│   └── package.json
├── database/                 # SQL şema ve bakım scriptleri
├── apis.md                   # REST API referansı
├── mail_notify.md            # E-posta ve push hatırlatmaları
└── README.md                 # Bu dosya
```

---

## Veritabanı

MySQL (veya MariaDB) üzerinde çalışır. Örnek dosyalar `database/` altında:

| Dosya | İçerik |
|-------|--------|
| `init.sql` | Çekirdek tablolar (kullanıcılar, oyun skorları, etkileşimler vb.) |
| `calendar_events.sql` | Kullanıcı takvim etkinlikleri |
| `symptom_screening.sql` | Şüphe taraması senaryoları |
| `notify_support.sql` | Expo token + hatırlatma dedupe log tablosu |
| `drop_nobetci_eczane.sql` | Eski nöbetçi tablosunu kaldırma (kullanıldıysa) |
| `drop_notification_inbox_columns.sql` | İsteğe bağlı sütun temizliği |

Sıra genelde: önce `init.sql`, sonra özellik dosyaları; detaylar için `apis.md` ve mevcut `server.js` sorguları referans alınır.

---

## Gereksinimler

- **Node.js** (LTS önerilir, örn. 20.x veya 22.x)
- **npm**
- **MySQL 8** veya uyumlu **MariaDB**
- Google Gemini ve SMTP için ilgili **hesap / anahtarlar** (üretimde `.env`)

---

## Yerel geliştirme

### 1. Veritabanı

MySQL’de veritabanı oluşturup `database/` içindeki uygun `.sql` dosyalarını içe aktarın.

### 2. Backend

```bash
cd backend
cp .env.example .env   # yoksa .env dosyasını elle oluşturun
npm install
npm start
```

Varsayılan dinleme: **`http://127.0.0.1:5000`** (HTTP). `PORT`, `BIND_HOST`, `DB_*`, `JWT_SECRET`, `GEMINI_API_KEY` vb. `.env` ile ayarlanır.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite, `/api` isteklerini `vite.config.js` üzerinden `http://127.0.0.1:5000` adresine yönlendirir.

Üretim build:

```bash
cd frontend
npm run build
```

Çıktı: `frontend/dist/` — statik hosting veya reverse proxy ile sunulur.

### 4. API adresi (üretim)

Build öncesi `frontend/.env.production` veya ortamda:

`VITE_API_URL=https://alanadiniz.com/api`

(Sonda `/api`, sonda fazladan `/` olmadan; kök domain kullanılıyorsa `config.js` mantığına bakın.)

---

## Üretim ortamı (özet)

Tipik kurulum:

1. **Node** süreci: `backend` klasöründe `npm start` (veya PM2/systemd).
2. **TLS**: Alan adı için Let’s Encrypt veya hosting sertifikası; **HTTPS** ile yayın.
3. **Reverse proxy** (Apache / nginx): `/api` → Node backend; statik dosyalar → `dist`.
4. Güvenlik duvarında gerekirse sadece **80/443** dışarıya açık; Node iç ağda `127.0.0.1` dinleyebilir (`BIND_HOST=127.0.0.1`).

---

## Ortam değişkenleri

### Backend (`.env`) — örnek alanlar

| Değişken | Açıklama |
|----------|-----------|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL bağlantısı |
| `PORT`, `BIND_HOST` | Sunucu portu ve dinleme arayüzü |
| `JWT_SECRET` | JWT imzası (güçlü ve gizli tutun) |
| `GEMINI_API_KEY` | Google Generative AI |
| `MAIL_USER`, `MAIL_PASS`, … | SMTP (hatırlatmalar) |
| `DISABLE_NOTIFY_CRON` | `1` ise dakikalık hatırlatma cron’u kapalı |
| `WATER_REMINDER_FIRST_HOUR`, `WATER_REMINDER_LAST_HOUR` | Su hatırlatması saat aralığı |

Tam liste ve davranış için `mail_notify.md` ve `server.js` içi kullanımlar incelenebilir.

---

## Dokümantasyon

| Dosya | İçerik |
|-------|--------|
| **apis.md** | REST uçları, JWT, multipart alanları, örnek istekler |
| **mail_notify.md** | E-posta hatırlatmaları, Expo push, cron, sorun giderme |

---

## Developer Team
 - Yusuf Türker ALBAYRAK [https://github.com/TurkerAlbayrak]
 - Hasan Erman DAĞ [https://github.com/hasanerman]
 - Mir Mehmet PEKER [https://github.com/mirmehmet]