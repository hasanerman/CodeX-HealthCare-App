# CodeX HealthCare — Backend API Referansı

Bu doküman, **mobil uygulama** ve diğer istemcilerin `server.js` (Express) üzerindeki uç noktaları nasıl kullanacağını özetler.

---

## 5000 mi, 5173 mü? (kısa cevap)

| Port | Ne çalışır | API burada mı? |
|------|------------|----------------|
| **5000** | **Node / Express** (`node server.js`) | **Evet.** Tüm `/api/...` yolları **burada** karşılanır. |
| **5173** | **Vite** (sadece geliştirme, React arayüzü) | **Hayır.** Tarayıcıda `http://localhost:5173` açınca `/api` istekleri Vite tarafından **arka planda 5000’e proxy** edilir. |

- **Saf mobil uygulama** (React Native, Flutter, native HTTP): Base URL **`http://<adres>:5000/api`** — **5173 kullanmayın** (mobil Vite proxy bilmez).
  - **Domain istemiyorsan / DNS–SSL sorunu varsa:** VDS **public IP** ile kullan: **`http://<VDS_PUBLIC_IP>:5000/api`**. Domain **şart değil**; istek yine aynı makinedeki Node API’ye gider.
  - **Kontrol listesi (IP:5000 dışarıdan çalışsın):**
    1. Sunucuda `node server.js` (veya PM2) **ayakta**.
    2. `.env` içinde **`BIND_HOST=127.0.0.1` olmasın** — boş bırak veya `BIND_HOST=0.0.0.0` (varsayılan `0.0.0.0`; sadece localhost dinlenirse dışarıdan 5000 **kapalı** kalır).
    3. VDS paneli + işletim sistemi güvenlik duvarında **gelen TCP 5000** açık.
    4. **Android 9+:** düz HTTP için uygulamada cleartext / network security config gerekebilir. **iOS:** ATS, HTTP’yi engelleyebilir; test için istisna veya geçici olarak HTTP’ye izin gerekir.
- **Üretim (HTTPS + domain, Apache reverse proxy):** `https://alanadin.com/api` — dışarıdan **443**; Apache içeride Node **5000**’e yönlendirir (bu modda 5000’i internete açmak şart değil).
- **Aynı WiFi’de telefon + geliştirme:**  
  1. PC’de `node server.js` çalışsın ve **`BIND_HOST` kapalıyken** sunucu **`0.0.0.0:5000`** dinlesin (projede varsayılan böyle).  
  2. Windows Güvenlik Duvarı’nda **5000 gelen TCP** açık olsun.  
  3. Mobilde base: `http://<PC’nin_yerel_IP’si>:5000/api` (ör. `http://192.168.1.105:5000/api`).  
  Eski ayarlarda Node sadece `127.0.0.1` dinliyorsa dışarıdan **hiçbir cihaz 5000’e bağlanamaz** — bu yüzden “5000’de denedik olmuyor” çoğu zaman bundandır.

### Domain mi, düz IP:5000 mi?

**İkisi de aynı backend’i (5000’deki Express) besler; mobil için domain zorunlu değil.**

- **`http://<VDS_PUBLIC_IP>:5000/api`** — Doğrudan Node’a bağlanırsın; **firewall’da 5000 açık** + Node **`0.0.0.0`** dinlemeli. Domain/DNS/Cloudflare ile uğraşmazsın; trafik şifrelenmez (HTTP).
- **`https://alanadin.com/api`** — DNS ismi sunucuya çözülür; genelde **443** üzerinden Apache proxy; dışarıya **5000 açmak zorunda değilsin**; TLS için uygundur.

**Mobil base URL örnekleri**

| Senaryo | Örnek base |
|--------|------------|
| IP ile (domain yok) | `http://203.0.113.10:5000/api` |
| HTTPS + domain | `https://alanadin.com/api` |

Örnek uçlar (base’e göre yol aynı):

- Giriş: `POST …/api/auth/login`
- Profil: `POST …/api/user/profile`
- Lab raporu: `POST …/api/analyze-report` (multipart)

**Yerel geliştirme — web (tarayıcı):** `npm run dev` → arayüz **5173**, `API_URL` varsayılan **`/api`** → Vite otomatik **5000**’e yönlendirir; ekstra ayar gerekmez.

**Yerel geliştirme — mobil istemci:** Yukarıdaki gibi **`http://<LAN_IP>:5000/api`**. İsterseniz geçici olarak `frontend/.env.development.local` içinde `VITE_API_URL=http://192.168.x.x:5000/api` tanımlayıp web’i de aynı backend’e kilitleyebilirsiniz.

**Ortak başlıklar**

| Başlık | Ne zaman |
|--------|-----------|
| `Content-Type: application/json` | JSON gövdesi olan `POST` istekleri |
| `Authorization: Bearer <JWT>` | Aşağıda “JWT gerekli” denen uçlar |
| `Content-Type: multipart/form-data` | Dosya yüklemeleri (sınır alanı adları aşağıda) |

---

## Kimlik doğrulama (JWT)

- **Login** yanıtındaki `token` değerini saklayın.
- Korumalı isteklerde: `Authorization: Bearer <token>`
- Token payload (decode ederseniz): `id` (kullanıcı id), `name`; süre: **24 saat** (`expiresIn: '24h'`).

---

## 1. Kayıt (Register)

| | |
|---|---|
| **Yöntem / yol** | `POST /api/auth/register` |
| **JWT** | Hayır |
| **Gövde (JSON)** | `{ "name": string, "email": string, "password": string }` |

**Başarılı yanıt:** `201`  
```json
{ "message": "Kayıt başarılı", "userId": 1 }
```

**Hata:** `500` — `{ "error": "Kayıt hatası" }`

---

## 2. Giriş (Login)

| | |
|---|---|
| **Yöntem / yol** | `POST /api/auth/login` |
| **JWT** | Hayır |
| **Gövde (JSON)** | `{ "email": string, "password": string }` |

**Başarılı yanıt:** `200`  
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "Ad Soyad",
    "height": null,
    "weight": null,
    "age": null,
    "gender": "erkek",
    "bmi_interpretation": null
  }
}
```

**Hata:** `401` — `{ "error": "Geçersiz email veya şifre" }`  
**Hata:** `500` — `{ "error": "Giriş hatası" }`

---

## 3. Profil güncelleme + AI vücut analizi

| | |
|---|---|
| **Yöntem / yol** | `POST /api/user/profile` |
| **JWT** | **Evet** |
| **Gövde (JSON)** | `{ "height": number \| string, "weight": number \| string, "age": number \| string, "gender": string }` |

Sunucu Gemini ile kısa klinik metin üretir, kullanıcı satırını günceller.

**Başarılı yanıt:** `200`  
```json
{
  "message": "Profil ve Analiz Güncellendi",
  "interpretation": "Uzun metin — AI analizi + uyarı cümlesi"
}
```

**Hata:** `401` / `403` — token yok veya geçersiz  
**Hata:** `500` — `{ "error": "Profil analizi hatası", "details": "..." }`

---

## 4. Son lab raporu kaydı (dashboard / özet)

| | |
|---|---|
| **Yöntem / yol** | `GET /api/user/last-report` |
| **JWT** | **Evet** |

Veritabanından kullanıcının **son** `module = "report"` etkileşimi döner.

**Kayıt yoksa:** `200` — `null` (JSON `null`)

**Kayıt varsa:** `200` — örnek yapı (MySQL satırı; alan adları şemaya göre değişebilir):

```json
{
  "id": 10,
  "user_id": 1,
  "module": "report",
  "query": "Kan Tahlili Analizi",
  "response": "{\"summary\":\"...\",\"critical_values\":[...]}",
  "created_at": "2026-04-04T12:00:00.000Z"
}
```

**Mobil kullanım:** `response` alanı **string** olarak saklanmış JSON’dur; ekranda kullanmadan önce `JSON.parse(row.response)` yapın (web istemcisi de böyle kullanıyor).

**Hata:** `500` — `{ "error": "Rapor alınamadı" }`

---

## 5. İlaç arama (metin)

| | |
|---|---|
| **Yöntem / yol** | `POST /api/drug/search` |
| **JWT** | Hayır (isteğe bağlı `userId` ile log) |
| **Gövde (JSON)** | `{ "drugName": string, "userId": number \| string \| optional }` |

Önce `drugs_library` tablosunda `LIKE` aranır; yoksa AI ile üretilir ve veritabanına yazılabilir.

**Başarılı yanıt:** `200` — örnek (AI / lokal farkı `source` ile anlaşılır):

```json
{
  "source": "CodeX Lokal Hafıza",
  "id": 1,
  "name": "...",
  "active_ingredient": "...",
  "description": "...",
  "usage_info": "...",
  "side_effects": "...",
  "warnings": "...",
  "dosage": "...",
  "alternatives": [
    { "name": "...", "description": "...", "drug_id": 1 }
  ]
}
```

Lokal kayıtta `alternatives` `natural_alternatives` join’inden gelir; AI yanıtında yapı benzer, `source` genelde `"Sistem Analizi (AI)"` olur.

**Hata:** `500` — `{ "error": "Arama hatası" }`

---

## 6. İlaç görsel analizi

| | |
|---|---|
| **Yöntem / yol** | `POST /api/drug/analyze-image` |
| **JWT** | Hayır |
| **Gövde** | **`multipart/form-data`** |

| Alan (form-data) | Zorunlu | Açıklama |
|------------------|---------|----------|
| `image` | Evet | Dosya alanı (`upload.single('image')`) |
| `userId` | Hayır | Gönderilirse etkileşim loglanır |

**Başarılı yanıt:** `200` — `/api/drug/search` ile aynı mantıkta ilaç nesnesi (+ `source`).

**Hata:** `400` — `{ "error": "Dosya yok" }`  
**Hata:** `500` — `{ "error": "Görsel analiz hatası" }`

**Mobil:** Kamera/galeri dosyasını `multipart` ile `image` adıyla gönderin; `Content-Type` otomatik sınır (boundary) ile set edilmelidir.

---

## 7. Kan tahlili / lab raporu analizi

| | |
|---|---|
| **Yöntem / yol** | `POST /api/analyze-report` |
| **JWT** | Hayır |
| **Gövde** | **`multipart/form-data`** |

| Alan (form-data) | Zorunlu | Açıklama |
|------------------|---------|----------|
| `report` | Evet | PDF veya görsel (`upload.single('report')`) |
| `userId` | Hayır | Gönderilirse `user_interactions` içine loglanır |

**Başarılı yanıt:** `200` — JSON (AI çıktısı; mobilde isteğe bağlı olarak web’deki `normalizeLabReportResponse` benzeri bir katman uygulayabilirsiniz):

```json
{
  "summary": "Kısa özet metin",
  "critical_values": [
    {
      "name": "Hemoglobin",
      "value": "11.2",
      "unit": "g/dL",
      "reference_range": "12-16 g/dL",
      "status": "Düşük",
      "meaning": "Hemoglobin: ..."
    }
  ],
  "recommendations": {
    "drinks": ["..."],
    "foods": ["..."],
    "medications": ["..."]
  },
  "medication_suggestions": "Genel klinik yorum",
  "disclaimer": "CodeX Doktor Değildir..."
}
```

**Hata:** `400` — `{ "error": "Rapor yok" }`  
**Hata:** `500` — `{ "error": "Rapor hatası" }`

---

## 8. Oyun skoru kaydet

| | |
|---|---|
| **Yöntem / yol** | `POST /api/games/save-score` |
| **JWT** | **Evet** |
| **Gövde (JSON)** | Aşağıdaki tablo |

| Alan | Tip | Not |
|------|-----|-----|
| `gameType` | string | Örn. `"memory"`, `"reaction"` |
| `difficulty` | string | Örn. zorluk seviyesi |
| `moves` | number | Opsiyonel; yoksa `0` yazılır |
| `timeSeconds` | number | Süre (saniye veya ilgili birim — istemci ile uyumlu tutun) |
| `comment` | string \| null | Opsiyonel |

**Başarılı yanıt:** `200` — `{ "message": "Skor kaydedildi" }`

**Hata:** `500` — `{ "error": "Skor kaydı hatası" }`

---

## 9. Oyun geçmişi

| | |
|---|---|
| **Yöntem / yol** | `GET /api/user/game-history` |
| **JWT** | **Evet** |

**Başarılı yanıt:** `200` — dizi (en yeni önce, en fazla 50 kayıt). Örnek eleman:

```json
{
  "id": 1,
  "user_id": 1,
  "game_type": "memory",
  "difficulty": "easy",
  "moves": 24,
  "time_seconds": 45.5,
  "comment": "[Analiz: ...]",
  "created_at": "2026-04-04T10:00:00.000Z"
}
```

**Hata:** `500` — `{ "error": "Geçmiş alınamadı" }`

---

## Özet tablo

| Yöntem | Yol | JWT |
|--------|-----|-----|
| POST | `/api/auth/register` | Hayır |
| POST | `/api/auth/login` | Hayır |
| POST | `/api/user/profile` | Evet |
| GET | `/api/user/last-report` | Evet |
| POST | `/api/drug/search` | Hayır |
| POST | `/api/drug/analyze-image` | Hayır (multipart) |
| POST | `/api/analyze-report` | Hayır (multipart) |
| POST | `/api/games/save-score` | Evet |
| GET | `/api/user/game-history` | Evet |

---

## Mobil entegrasyon notları

1. **Base URL:**  
   - **Sadece IP (domain gerekmez):** `http://<VDS_PUBLIC_IP>:5000/api` — Node **5000**’de çalışmalı, **`BIND_HOST`** localhost’a kilitli olmamalı, **TCP 5000** dışarıdan erişilebilir olmalı.  
   - **HTTPS + domain:** `https://alanadin.com/api` — Apache (veya benzeri) `/api` → `127.0.0.1:5000`.  
   - **Yerel LAN:** `http://<PC_LAN_IP>:5000/api` (aynı WiFi testi).  
   Uzun vadede mağaza yayını için **HTTPS** tercih edilir; domain sorunu yaşarken **IP:5000** ile geliştirme ve test tamamen geçerli bir yoldur.
2. **HTTPS:** Mağaza / gerçek kullanıcı için TLS önerilir; IP:5000 ile **HTTP** kullanıyorsan trafik şifrelenmez.
3. **Multipart:** React Native / Flutter / native’de kütüphaneler genelde `FormData` + dosya URI/blob ile aynı alan adlarını (`image`, `report`) kullanır.
4. **`userId`:** İlaç ve rapor uçlarında JWT zorunlu değil; giriş yapmış kullanıcı için etkileşim logu istiyorsanız login’den dönen `user.id` değerini form alanı olarak ekleyin.
5. **CORS:** Saf native HTTP istemcilerinde CORS yok; tarayıcı tabanlı hibrit (Capacitor WebView vb.) kullanırsanız sunucuda `cors()` ayarını domain’inize göre sıkılaştırın.

---

*Bu dosya mevcut `backend/server.js` ile uyumludur; yeni endpoint eklendiğinde burayı güncelleyin.*
