# CodeX HealthCare — Mobil (ve çoklu istemci) entegrasyonu için yapay zeka talimat dokümanı

Bu metni **başka bir yapay zekaya veya geliştiriciye tek parça prompt olarak** verebilirsiniz. Amaç: Mevcut **Node.js + Express + MySQL** backend’i bozmadan, **aynı kullanıcı hesaplarıyla** web ve mobil istemcilerin sorunsuz çalışması; mobilde **PDF / görsel rapor yükleme**, **ilaç görseli**, giriş-kayıt, profil, oyun skorları ve lab analizi akışlarının **eksiksiz** uygulanması.

---

## 1) Senin rolün ve hedefin

- **Rol:** Bu API sözleşmesine uygun mobil (veya ek istemci) kodu üretmek, entegrasyon hatalarını önlemek, backend ile uyumlu istekler atmak.
- **Hedef:** Tek bir backend (`server.js`) kullan; **web ile mobil aynı `users` tablosunu ve aynı JWT mantığını** paylaşsın. Backend’de **multer alan adlarını, JSON gövde şeklini ve JWT başlığını** değiştirme; istemciyi buna göre yaz.
- **Kısıt:** Bu doküandaki endpoint yolları ve **form-data alan isimleri** backend kodu ile **birebir** eşleşmeli. Yanlış isim = `400` veya beklenmeyen hata.

---

## 2) Sistem mimarisi (kısa ve net)

```
[React Web] ──┐
              ├──► HTTP/HTTPS ──► [Express API :5000] ──► [MySQL]
[Mobil App] ──┘
```

- **Web:** `frontend` (Vite + React). API adresi `frontend/src/config.js` içindeki `API_URL`.
- **Backend:** `backend/server.js`, önek yolu **`/api`** (ör. `/api/auth/login`).
- **Ortak kullanıcı:** Kayıt ve giriş **aynı** `POST /api/auth/register` ve `POST /api/auth/login` ile yapılır. Web’de açılan hesap mobilde, mobilde açılan hesap web’de aynıdır (aynı veritabanı).

---

## 3) Base URL (şu anki üretim / VDS)

- **API kökü (base):** `http://185.7.241.52:5000/api`
- **Kural:** Tüm istekler `BASE + yol` ile yapılır. Örnek: `POST http://185.7.241.52:5000/api/auth/login`
- **Not:** Şu an HTTP kullanılıyor. Üretimde ideal olan **HTTPS + alan adı**dır; URL değişince mobil ve web `API_URL` güncellenmeli.
- **Yerel backend:** Geliştirme makinesinde backend çalışıyorsa base `http://localhost:5000/api` veya `http://<LAN_IP>:5000/api` olabilir.

---

## 4) Kimlik doğrulama — web ve mobil aynı hesap

### 4.1 Kayıt (hesap oluşturma)

- **Yöntem:** `POST`
- **Tam URL:** `{BASE}/auth/register`
- **JWT:** Gerekmez.
- **Header:** `Content-Type: application/json`
- **Body (JSON, zorunlu alanlar):**
  - `name` (string)
  - `email` (string)
  - `password` (string)
- **Başarı:** HTTP `201`, örnek: `{ "message": "Kayıt başarılı", "userId": <number> }`
- **Hata:** HTTP `500`, örnek: `{ "error": "Kayıt hatası" }`

### 4.2 Giriş (oturum)

- **Yöntem:** `POST`
- **Tam URL:** `{BASE}/auth/login`
- **JWT:** Gerekmez.
- **Header:** `Content-Type: application/json`
- **Body (JSON):**
  - `email` (string)
  - `password` (string)
- **Başarı:** HTTP `200`
  ```json
  {
    "token": "<JWT_string>",
    "user": {
      "id": 1,
      "name": "...",
      "height": null,
      "weight": null,
      "age": null,
      "gender": "erkek",
      "bmi_interpretation": null
    }
  }
  ```
- **Hata:** HTTP `401` — `{ "error": "Geçersiz email veya şifre" }`
- **Hata:** HTTP `500` — `{ "error": "Giriş hatası" }`

### 4.3 JWT’yi mobilde saklama ve kullanma

- Login yanıtındaki **`token`** değerini güvenli şekilde sakla (ör. iOS Keychain, Android EncryptedSharedPreferences / Keystore).
- **Korumalı** endpoint’lerde her istekte şu header **zorunlu:**
  - `Authorization: Bearer <token>`
- **Boşluk önemli:** `Bearer` kelimesinden sonra **tek boşluk**, sonra ham token.
- Token süresi backend’de **24 saat** (`expiresIn: '24h'`). Süresi dolunca kullanıcıyı tekrar login ekranına yönlendir veya refresh akışı eklersen dokümante et (şu an backend’de refresh token yok).
- **401:** Token yok. **403:** Token geçersiz/verify hatası. Mobil uygulama bu durumlarda oturumu temizleyip login’e dönmeli.

---

## 5) Korumalı endpoint’ler (JWT zorunlu)

Aşağıdakilerde **`Authorization: Bearer <token>`** olmadan istek atma.

### 5.1 Profil güncelleme + AI vücut analizi metni

- **Yöntem:** `POST`
- **URL:** `{BASE}/user/profile`
- **Header:** `Content-Type: application/json` + `Authorization: Bearer <token>`
- **Body (JSON):** En azından backend’in beklediği alanlar (sayı veya string olabilir):
  - `height`, `weight`, `age`, `gender`
- **Başarı:** `200` — `{ "message": "Profil ve Analiz Güncellendi", "interpretation": "<uzun metin>" }`
- **Hata:** `401`/`403` (token), `500` — `{ "error": "Profil analizi hatası", "details": "..." }`

### 5.2 Son kayıtlı lab raporu özeti (veritabanından)

- **Yöntem:** `GET`
- **URL:** `{BASE}/user/last-report`
- **Header:** `Authorization: Bearer <token>`
- **Body:** Yok.
- **Başarı:** `200`
  - Kayıt yoksa: **`null`** (JSON null).
  - Kayıt varsa: MySQL satırı nesnesi. Önemli alanlar:
    - `module` — rapor için `"report"`
    - `response` — **DİKKAT:** Bu alan veritabanında **JSON string** olarak tutuluyor; mobilde **mutlaka** `JSON.parse(kayit.response)` ile nesneye çevir. İçerik lab analizi JSON’u (`summary`, `critical_values`, vb.) olabilir.
    - `query`, `created_at`, `user_id`, `id` vb.

### 5.3 Oyun skoru kaydet

- **Yöntem:** `POST`
- **URL:** `{BASE}/games/save-score`
- **Header:** `Content-Type: application/json` + `Authorization: Bearer <token>`
- **Body (JSON):**
  - `gameType` (string) — örn. `"memory"`, `"reaction"`
  - `difficulty` (string)
  - `moves` (number, opsiyonel; yoksa backend `0` yazar)
  - `timeSeconds` (number)
  - `comment` (string veya null, opsiyonel)
- **Başarı:** `200` — `{ "message": "Skor kaydedildi" }`
- **Hata:** `500` — `{ "error": "Skor kaydı hatası" }`

### 5.4 Oyun geçmişi listesi

- **Yöntem:** `GET`
- **URL:** `{BASE}/user/game-history`
- **Header:** `Authorization: Bearer <token>`
- **Başarı:** `200` — dizi (en yeni önce, en fazla 50). Elemanlarda `game_type`, `difficulty`, `moves`, `time_seconds`, `comment`, `created_at` vb. bulunur.

---

## 6) JWT gerektirmeyen endpoint’ler (genel / dosya)

Bunlarda **Authorization header şart değil**. Ancak giriş yapmış kullanıcı için sunucuda **etkileşim logu** isteniyorsa **`userId`** gönder.

### 6.1 İlaç metin araması

- **Yöntem:** `POST`
- **URL:** `{BASE}/drug/search`
- **Header:** `Content-Type: application/json`
- **Body (JSON):**
  - `drugName` (string, zorunlu)
  - `userId` (number veya string, **opsiyonel**) — varsa arama sonucu kullanıcıya loglanır
- **Başarı:** `200` — ilaç nesnesi; `source` alanı `"CodeX Lokal Hafıza"` veya `"Sistem Analizi (AI)"` olabilir; `alternatives` dizisi gelebilir.

### 6.2 İlaç görsel analizi (kamera / galeri)

- **Yöntem:** `POST`
- **URL:** `{BASE}/drug/analyze-image`
- **Content-Type:** **`multipart/form-data`** (istemci boundary’yi otomatik üretmeli; elle `application/json` gönderme)
- **Form alanları (isimler backend ile birebir aynı olmalı):**
  | Alan adı | Zorunlu | Açıklama |
  |----------|---------|----------|
  | `image` | **Evet** | Dosya. Backend: `upload.single('image')` |
  | `userId` | Hayır | String veya number; log için |
- **Başarı:** `200` — ilaç nesnesi (search ile benzer yapı)
- **Hata:** `400` — `{ "error": "Dosya yok" }` → Dosya alanının adı **`image`** değilse veya dosya eklenmemişse oluşur.
- **Hata:** `500` — `{ "error": "Görsel analiz hatası" }`

### 6.3 Lab / kan tahlili raporu analizi — **mobilde PDF veya görsel**

Bu endpoint, kullanıcının **PDF veya görüntü** olarak yüklediği raporu sunucunun Gemini ile analiz etmesi içindir. **Web’de de aynı endpoint kullanılıyor.**

- **Yöntem:** `POST`
- **URL:** `{BASE}/analyze-report`
- **Content-Type:** **`multipart/form-data`**
- **Form alanları:**
  | Alan adı | Zorunlu | Açıklama |
  |----------|---------|----------|
  | `report` | **Evet** | **PDF veya resim dosyası.** Backend: `upload.single('report')`. Alan adı tam olarak **`report`** olmalı; `file`, `pdf`, `document` gibi isimler **çalışmaz**. |
  | `userId` | Hayır | Giriş yapmış kullanıcının `user.id` değeri; gönderilirse analiz `user_interactions` tablosuna bağlanır. |
- **Başarı:** `200` — JSON gövde (parse edilmiş), örnek yapı:
  ```json
  {
    "summary": "string",
    "critical_values": [
      {
        "name": "string",
        "value": "string",
        "unit": "string",
        "reference_range": "string",
        "status": "string",
        "meaning": "string"
      }
    ],
    "recommendations": {
      "drinks": ["..."],
      "foods": ["..."],
      "medications": ["..."]
    },
    "medication_suggestions": "string",
    "disclaimer": "string"
  }
  ```
- **Hata:** `400` — `{ "error": "Rapor yok" }` → **`report` alanı eksik veya dosya yok.**
- **Hata:** `500` — `{ "error": "Rapor hatası" }`

**Mobil uygulama için uygulama talimatı (PDF dahil):**

1. Kullanıcıdan dosya seç (PDF, veya PNG/JPEG vb. — backend `req.file.mimetype` ile Gemini’ye iletir).
2. `multipart/form-data` oluştur.
3. Dosyayı **alan adı `report`** ile ekle.
4. Kullanıcı login olduysa aynı isteğe **`userId`** alanını string olarak ekle (ör. `FormData.append('userId', String(user.id))`).
5. **`Content-Type` header’ını elle `application/json` yapma**; çok parçalı istek kütüphanesi boundary’yi kendisi koysun.
6. Büyük PDF’lerde zaman aşımı süresini (timeout) yeterli tut (ör. 60–120 saniye).

---

## 7) Backend’i bozmamak için kritik kurallar

1. **Multer alan adları:** Sadece `image` (ilaç görseli) ve `report` (lab dosyası). Başka isim kullanma.
2. **JSON uçlar:** `express.json()` ile gövde; `Content-Type: application/json` kullan.
3. **JWT:** Korumalı uçlarda header formatı tam `Bearer <token>`.
4. **`userId`:** String veya number kabul edilir; backend `req.body.userId` okur. JWT ile aynı kullanıcıyı bağlamak için mobilde login sonrası `user.id` gönder.
5. **CORS:** Backend `app.use(cors())` ile geniş açık; saf native mobilde sorun olmaz. **Capacitor / WebView** ile web origin’den istek varsa ileride CORS kısıtı gerekebilir — o zaman origin listesi sunucuda güncellenmeli.
6. **Port:** Varsayılan backend portu **5000**. VDS güvenlik duvarında **TCP 5000** açık olmalı (veya reverse proxy ile 443’e yönlendirme).

---

## 8) HTTP / HTTPS ve platform ayarları

- **Android (HTTP):** Uygulama düz HTTP kullanıyorsa (şu anki VDS IP ile), `usesCleartextTraffic` veya Network Security Config ile **185.7.241.52** için izin gerekebilir; aksi halde istekler sessizce başarısız olur.
- **iOS (ATS):** HTTP için `NSAppTransportSecurity` istisnası veya HTTPS’e geçiş gerekir.
- **Öneri:** Mümkün olan en kısa sürede **HTTPS + domain** kullan; base URL’yi tek yerde (`API_URL` benzeri) tut.

---

## 9) Hata yönetimi (mobil UX)

- Ağ hatalarında kullanıcıya anlaşılır mesaj; teknik detayı logla.
- `401`/`403`: Oturumu kapat, token sil, login ekranına dön.
- `400` multipart uçlarda: Dosya seçilmedi veya yanlış alan adı ihtimalini kontrol et.
- `500`: Sunucu / AI / DB; tekrar dene veya destek mesajı göster.

---

## 10) Özet endpoint listesi

| JWT | Method | Path (BASE sonrası) |
|-----|--------|----------------------|
| Hayır | POST | `/auth/register` |
| Hayır | POST | `/auth/login` |
| Evet | POST | `/user/profile` |
| Evet | GET | `/user/last-report` |
| Hayır | POST | `/drug/search` |
| Hayır | POST | `/drug/analyze-image` (multipart: **`image`**) |
| Hayır | POST | `/analyze-report` (multipart: **`report`** — **PDF veya görsel**) |
| Evet | POST | `/games/save-score` |
| Evet | GET | `/user/game-history` |

**BASE =** `http://185.7.241.52:5000/api` (güncel deployment’a göre değiştirilebilir).

---

## 11) Tıbbi / yasal uyarı (UI’da göstermek için)

Backend ve AI çıktıları **teşhis veya tedavi yerine geçmez**. Uygulamada kullanıcıya “CodeX doktor değildir” benzeri uyarılar gösterilmelidir; `disclaimer` alanlarını ekranda kullan.

---

## 12) Alıcı yapay zekaya son talimat

Bu dokümandaki **URL’ler, HTTP metotları, header kuralları ve özellikle multipart alan adları (`report`, `image`)** dışına çıkma. Mobil uygulamayı implement ederken **PDF yükleme** için `POST {BASE}/analyze-report` ve **`report`** alanını kullan. **Aynı kullanıcı hesapları** için yalnızca bu backend’in `register` / `login` / JWT akışını kullan. Backend kodunu değiştirmeden istemci tarafını bu sözleşmeye %100 uydur.

---

*Bu doküman, `backend/server.js` ve `apis.md` ile uyumlu olacak şekilde yazılmıştır. Backend’e yeni endpoint veya alan eklendiğinde bu dosyayı güncelleyin.*
