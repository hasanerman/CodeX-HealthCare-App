# CodeX HealthCare — Mobil entegrasyon: Takvim + Hastalık şüphe taraması

Bu doküman **mobil uygulama** (Flutter, React Native, Kotlin, Swift vb.) ve **başka bir yapay zekâ / geliştirici** için hazırlanmıştır. Amaç: aynı backend (`server.js`) üzerinden **takvim** ve **şüphe tarama (soru-cevap)** akışlarını hatasız bağlamak.

> **Not:** Dosya adı `calendar_questions.md` olsa da içerik hem **takvim API** hem **tarama (screening) API** içerir.

---

## 1) Base URL ve ortak kurallar

- Tüm yollar **`/api`** öneki ile başlar.
- Örnek base: `https://sunucun.com/api` veya `http://<IP>:5000/api` (sonda `/` olmasın; istekler `BASE + /calendar/...` şeklinde birleştirilir).
- **JSON** gövdelerinde: `Content-Type: application/json`
- **UTF-8** Türkçe metinler desteklenir.

### JWT (takvim için zorunlu)

| Uç | JWT |
|----|-----|
| Takvim (`/api/calendar/*`) | **Zorunlu** — `Authorization: Bearer <token>` |
| Tarama listesi / sorular (`/api/screening/conditions`, `.../questions`) | **İsteğe bağlı** (şu an backend’de açık) |
| Tarama gönder (`/api/screening/submit`) | **İsteğe bağlı**; isteğe bağlı `userId` ile sunucu tarafında log |

Mobil uygulama genelde önce `POST /api/auth/login` ile token alır; takvim isteklerinde bu token’ı ekler.

---

## 2) Kimlik: login (takvim öncesi)

**İstek:** `POST {BASE}/auth/login`

**Gövde:**

```json
{
  "email": "kullanici@ornek.com",
  "password": "şifre"
}
```

**Başarı (200):** `{ "token": "<JWT>", "user": { "id", "name", "height", "weight", "age", "gender", "bmi_interpretation" } }`

**Sonraki istekler:**

```http
Authorization: Bearer <token>
```

Token süresi backend’de yaklaşık **24 saat**. Süresi dolunca tekrar login veya (ileride) refresh akışı.

---

## 3) Hastalık şüphe taraması (screening) — mobil API

### 3.1 Akış özeti (uygulama mantığı)

1. `GET /screening/conditions` → kullanıcıya liste göster (başlık, açıklama, `slug`).
2. Kullanıcı bir satır seçer → `GET /screening/conditions/{slug}/questions` → soruları ve şıkları çek.
3. Her soru için **tam olarak bir** `optionId` seçilir; tüm sorular cevaplanmalı.
4. `POST /screening/submit` ile `slug`, `answers`, isteğe bağlı `lat`, `lon`, `userId` gönder.
5. Dönen `ai` nesnesini ve varsa `nearestHospital` bilgisini UI’da göster; **tıbbi uyarı** metinlerini olduğu gibi kullan.

**Kritik:** Gövdedeki alan adları **birebir** `questionId` ve `optionId` (camelCase) olmalı; `question_id` kullanmak 400/eksik eşleşme üretir.

### 3.2 `GET /screening/conditions`

- **JWT:** gerekmez (mevcut backend).
- **Yanıt:** dizi; örnek öğe:

```json
{
  "id": 1,
  "slug": "kalp_krizi",
  "title": "Kalp krizi / göğüs ağrısı şüphesi",
  "description": "…",
  "sort_order": 1
}
```

**Bilinen `slug` değerleri (seed):** `kalp_krizi`, `inme`, `nefes_darligi`, `seker_dengesizligi`, `siddetli_bas_agrisi`, `anafilaksi`

### 3.3 `GET /screening/conditions/:slug/questions`

- **Örnek:** `GET {BASE}/screening/conditions/kalp_krizi/questions`
- **Yanıt:**

```json
{
  "condition": {
    "id": 1,
    "slug": "kalp_krizi",
    "title": "…",
    "description": "…"
  },
  "questions": [
    {
      "id": 1,
      "prompt": "Soru metni…",
      "sort_order": 1,
      "options": [
        { "id": 10, "label": "Şık metni", "sort_order": 1 }
      ]
    }
  ]
}
```

**Önemli:** API **risk puanlarını** şıklarda **döndürmez**; sadece `id`, `label`, `sort_order`.

### 3.4 `POST /screening/submit`

**Gövde:**

```json
{
  "slug": "kalp_krizi",
  "answers": [
    { "questionId": 1, "optionId": 10 },
    { "questionId": 2, "optionId": 14 }
  ],
  "lat": 41.0082,
  "lon": 28.9784,
  "userId": 5
}
```

- `answers`: Bu türe ait **tüm** sorular için **geçerli** eşleşme gerekir (her `questionId` bir kez; `optionId` o soruya ait olmalı).
- `lat` / `lon`: verilirse sunucu yakın **hastane** tahmini için Overpass kullanır; yoksa `nearestHospital` null olabilir.
- `userId`: login olan kullanıcının `user.id` ile aynı olmalı; sunucu `user_interactions` modülü `screening` ile loglayabilir. İstemci göndermezse sadece log atlanır.

**Başarı (200) — örnek yapı:**

```json
{
  "condition": { "id": 1, "slug": "kalp_krizi", "title": "…" },
  "score": 12,
  "maxScore": 18,
  "ai": {
    "interpretation": "…",
    "suspicion_level_label": "Orta endişe",
    "natural_methods": ["…"],
    "doctor_importance": "…",
    "emergency_note": null,
    "disclaimer": "…"
  },
  "nearestHospital": {
    "name": "…",
    "lat": 41.0,
    "lon": 29.0,
    "distanceKm": 2.3
  }
}
```

**Hata örnekleri:** `400` (eksik cevap, geçersiz slug), `404` (slug yok), `500` (Gemini / sunucu).

---

## 4) Takvim (calendar) — mobil API

Tüm uçlar **JWT zorunlu**.

### 4.1 `GET /calendar/events`

**Query:** `year` (sayı), `month` (1–12)

Örnek: `GET {BASE}/calendar/events?year=2026&month=4`

**Yanıt:** o ay içindeki etkinliklerin dizisi:

```json
[
  {
    "id": 12,
    "title": "Aspirin",
    "notes": "Yemekten sonra",
    "kind": "medication",
    "event_date": "2026-04-15",
    "event_time": "09:30",
    "created_at": "…",
    "updated_at": "…"
  }
]
```

- `kind`: `"event"` | `"medication"` | `"reminder"`
- `event_time`: yoksa `null`; varsa genelde `"HH:MM"` (5 karakter).

### 4.2 `POST /calendar/events`

**Gövde:**

```json
{
  "title": "Kontrol randevusu",
  "notes": "Dahiliye",
  "kind": "event",
  "event_date": "2026-04-20",
  "event_time": "14:00:00"
}
```

- `title`: zorunlu.
- `kind`: yoksa sunucu `event` kabul eder; aksi halde yukarıdaki üç değerden biri.
- `event_date`: **YYYY-MM-DD** (regex ile doğrulanır).
- `event_time`: isteğe bağlı; mobilde `HH:MM` gönderilirse sunucu `HH:MM:00` saklar. Boş / null → gün boyu kayıt.

**Başarı:** `201` + oluşturulan nesne (GET ile aynı şema).

### 4.3 `PUT /calendar/events/:id`

Gövde `POST` ile aynı alanlar. Sadece **token’daki kullanıcıya ait** kayıt güncellenir; aksi `404`.

### 4.4 `DELETE /calendar/events/:id`

**Başarı:** `200` `{ "ok": true }` — yetkisiz veya yoksa `404`.

---

## 5) Başka bir yapay zekâ için: nasıl entegre edilir?

Aşağıdaki maddeleri **prompt / görev tanımı** olarak kullanabilirsiniz.

### 5.1 Genel

- Backend **REST**; mobil istemci HTTP istemcisi (OkHttp, Alamofire, Dio, axios vb.) kullanır.
- **Takvim** ve **korumalı profil** uçları için JWT’yi güvenli depoda saklayın (Keychain / EncryptedSharedPreferences).
- **Screening** okuma uçları şu an anonim; üretimde isterseniz backend’e JWT zorunluluğu eklenebilir — o zaman doküman güncellenmeli.

### 5.2 Tarama ekranı üretirken

1. Koşulları `GET …/screening/conditions` ile çek; listeyi `slug` ile yönlendir.
2. Soru ekranını `GET …/screening/conditions/{slug}/questions` ile doldur.
3. UI’da her soru için seçilen değeri `{ questionId, optionId }` olarak biriktir (`id` alanları API’den gelen tamsayılar).
4. Gönderimde **hiçbir soru atlama**; backend tüm sorular için geçerli cevap bekler.
5. Yanıttaki `ai.emergency_note` doluysa öne çıkar (acil yönlendirme metni).
6. `nearestHospital` için harita / “yol tarifi” linki: örn. Google Maps `destination=lat,lon`.

### 5.3 Takvim ekranı üretirken

1. Ay değiştikçe `GET …/calendar/events?year=&month=` çağır.
2. Gün hücrelerini `event_date` ile grupla; `event_time` varsa sırala.
3. Oluşturma / düzenleme formlarında tarihi `YYYY-MM-DD`, saati `HH:MM` veya `HH:MM:SS` gönder.
4. Silmeden önce `DELETE …/calendar/events/{id}` kullan.

### 5.4 Sık hatalar (kaçının)

| Hata | Sonuç |
|------|--------|
| Takvim isteğinde JWT unutuldu | `401` |
| Screening `answers` içinde `question_id` kullanmak | Eşleşmez / eksik cevap |
| `event_date` formatı `DD.MM.YYYY` | `400` |
| `kind` için başka string | `400` Geçersiz tür |
| Ay dışı tarihli etkinlik listelemek | O ay `GET` ile gelmez; doğru `year`/`month` kullanın |

### 5.5 Veritabanı önkoşulları

- **Tarama:** `database/symptom_screening.sql` içe aktarılmış olmalı.
- **Takvim:** `database/calendar_events.sql` içe aktarılmış olmalı.

---

## 6) Örnek cURL (referans)

**Login:**

```bash
curl -s -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"a@b.com\",\"password\":\"secret\"}"
```

**Takvim (aylık):**

```bash
curl -s "http://localhost:5000/api/calendar/events?year=2026&month=4" \
  -H "Authorization: Bearer <TOKEN>"
```

**Tarama gönder** (örnek iskelet — gerçek istekte `answers` o `slug` için gelen **bütün** soruları içermeli; aşağıda sadece iki satır örnek):

```bash
curl -s -X POST "http://localhost:5000/api/screening/submit" \
  -H "Content-Type: application/json" \
  -d "{\"slug\":\"kalp_krizi\",\"answers\":[{\"questionId\":1,\"optionId\":3},{\"questionId\":2,\"optionId\":7}],\"lat\":41.0082,\"lon\":28.9784,\"userId\":1}"
```

---

## 7) İleride: Gmail hatırlatıcı

Takvim kayıtları sunucuda `user_calendar_events` tablosunda tutulur; ileride zamanlanmış görev veya Gmail API ile hatırlatıcı eklendiğinde mobil tarafın **aynı CRUD API**’sini kullanmaya devam etmesi yeterlidir — ek mobil sözleşme backend eklendikçe bu dosyaya yeni bölüm yazılmalıdır.

---

*Bu doküman CodeX HealthCare backend ile uyumludur; değişiklik olursa `server.js` ile karşılaştırılmalıdır.*
