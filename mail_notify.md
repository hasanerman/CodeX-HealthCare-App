# CodeX HealthCare — E-posta ve mobil bildirim (Expo) entegrasyonu

Bu doküman, **mobil uygulamayı geliştiren yapay zeka veya geliştirici** için hazırlanmıştır. Backend **Expo Push API** üzerinden bildirim gönderir; **Expo SDK kurulumu ve bildirim izinleri tamamen mobil tarafta** yapılır. Sunucu yalnızca kayıtlı **Expo push token**’larına HTTP ile push iletir.

Genel API üslubu, base URL ve JWT kuralları **`apis.md`** ile **aynıdır**.

---

## 1) Mimari özet

| Kanal | Kim tetikler | Kim alır |
|--------|----------------|-----------|
| **E-posta** | Sunucu (Gmail SMTP, `nodemailer`) | Kullanıcının `users.email` adresi |
| **Push** | Sunucu → `https://exp.host/--/api/v2/push/send` | Token’ı `POST /api/notify/register-device` ile kaydeden cihaz |

- **Saat dilimi:** Cron **Europe/Istanbul** (`node-cron`); takvimde kalan süre ayrıca MySQL oturumunda `+03:00` ile hesaplanır (bkz. §4).
- **Kullanıcı tercihi:** Şu an **yok**; kayıtlı kullanıcılar için hatırlatmalar varsayılan olarak uygulanır (ileride profil bayrakları eklenebilir).
- **Takvim hatırlatmaları** yalnızca etkinlikte **`event_time` dolu** ise çalışır (tarih + saat birleştirilir). Saatsiz kayıtlar bu dört hatırlatmayı **tetiklemez**.
- **Mobil / ürün notu:** Takvim hatırlatması (e-posta ve aynı tick’teki push) için kullanıcının veritabanındaki **`users.email` alanı dolu ve geçerli olmalıdır**. Boşsa sunucu o etkinliği **atlar** (dedupe yazılmaz). Kayıt veya profil akışında e-postanın zorunlu tutulması önerilir.

---

## 2) Veritabanı (sunucu yöneticisi)

Sunucuda bir kez çalıştırın:

```bash
mysql -u root -p codex_healthcare < database/notify_support.sql
```

Oluşan tablolar:

- **`user_expo_push_tokens`:** `user_id` + `expo_push_token` (aynı kullanıcı birden fazla cihaz kaydedebilir).
- **`notification_sent_log`:** Aynı hatırlatmanın tekrar tekrar gönderilmesini önlemek için **benzersiz `dedupe_key`** ile log.

---

## 3) Sunucu ortam değişkenleri (`.env`)

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `MAIL_USER` | Evet (e-posta için) | Gönderen Gmail, örn. `codexhealthcareapp@gmail.com` |
| `MAIL_PASS` veya `MAIL_PASSWORD` | Evet | Gmail **uygulama şifresi** (normal şifre değil) |
| `MAIL_FROM_NAME` | Hayır | Varsayılan: `CodeX HealthCare` |
| `MAIL_HOST` | Hayır | Varsayılan: `smtp.gmail.com` |
| `MAIL_PORT` | Hayır | Varsayılan: `465` |
| `MAIL_SECURE` | Hayır | Varsayılan: `true` |
| `WATER_REMINDER_FIRST_HOUR` | Hayır | Varsayılan: `8` (08:00 İstanbul) |
| `WATER_REMINDER_LAST_HOUR` | Hayır | Varsayılan: `21` (21:00 İstanbul **dahil**; 22:00’da su bildirimi yok) |
| `DISABLE_NOTIFY_CRON` | Hayır | `1` ise dakikalık hatırlatma döngüsü **çalışmaz** (geliştirme) |
| `MAIL_USE_TLS587` | Hayır | `1` ise SMTP **587 + STARTTLS** (kurumsal ağda 465 blokluysa) |
| `MAIL_DEBUG_BCC_SELF` | Hayır | `1` ise gönderen hesaba gizli kopya (SMTP testi) |
| `DEBUG_MAIL` | Hayır | `1` ise sunucu konsoluna `messageId` logu |

E-posta ayarları yoksa sunucu uyarı verir ve **takvim + su hatırlatmaları gönderilmez** (worker erken çıkar). **Takvim** akışında push, aynı hatırlatma için **e-posta başarılı gönderildikten hemen sonra** tetiklenir; e-posta hata verirse dedupe silinir ve push o turda gitmez.

---

## 4) Zamanlayıcı davranışı

- **Cron:** `Europe/Istanbul` için **her dakika** çalışır (`node-cron`).
- **Takvim — kalan dakika MySQL’de:** Pool’daki her yeni bağlantıda `SET time_zone = '+03:00'` (`server.js` → `pool.on('connection', ...)`) uygulanır. Takvim sorgusu ayrıca **tek bir havuz bağlantısı** üzerinde önce `SET time_zone`, ardından `SELECT` çalıştırır (`reminderWorker.js`) — `NOW()` ile `TIMESTAMPDIFF` aynı oturumda kalır. `TIMESTAMPDIFF(MINUTE, NOW(), TIMESTAMP(CONCAT(tarih, ' ', saat)))` ile kalan süre **veritabanında** hesaplanır. Hedef süreye **±2 dakika** tolerans uygulanır. E-postası olmayan kullanıcılar için hatırlatma **atlanır** (dedupe yazılmaz). `notification_sent_log` ile her `(etkinlik, offset)` çifti **yalnızca bir kez** işlenir:
  - **1440 dk** → 24 saat kala  
  - **360 dk** → 6 saat kala  
  - **60 dk** → 1 saat kala  
  - **15 dk** → 15 dakika kala  

  `dedupe_key` örneği: `ce:<eventId>:24h`

- **Su:** İstanbul’da saat **tam saat başı** (`:00`) ve saat **8–21 arası (dahil)** her kullanıcıya bir kez e-posta + push.  
  `dedupe_key` örneği: `water:2026-04-04:10:u<userId>`

---

## 5) Mobil — Expo push token’ı backend’e kaydetme

### 5.1 Ön koşullar (Expo tarafı, özet)

1. Projede `expo-notifications` (ve gerekli yapılandırma) kullanın.
2. Uygulama açılışında veya giriş sonrası **bildirim izni** isteyin.
3. `Notifications.getExpoPushTokenAsync({ projectId: ... })` ile token alın (`app.json` / EAS `projectId` uyumlu olmalı).

Detay: [Expo Push Notifications](https://docs.expo.dev/push-notifications/push-notifications-setup/)

### 5.2 API — token kaydı

| | |
|---|---|
| **URL** | `POST {BASE}/notify/register-device` |
| **JWT** | **Zorunlu** — `Authorization: Bearer <login token>` |
| **Content-Type** | `application/json` |
| **Gövde** | `{ "expoPushToken": "<Expo'nun döndürdüğü tam string>" }` |

**Başarılı yanıt (`200`):**

```json
{ "message": "Cihaz bildirim kaydı güncellendi" }
```

**Hata (`400`):** `{ "error": "expoPushToken gerekli" }`

**Önerilen akış:** Kullanıcı `POST /api/auth/login` ile giriş yaptıktan sonra token alınır ve **hemen** bu endpoint’e gönderilir. Çıkışta veya token değişince yeniden gönderin.

### 5.3 API — token silme

| | |
|---|---|
| **URL** | `DELETE {BASE}/notify/register-device` |
| **JWT** | **Zorunlu** |
| **Gövde** | Boş `{}` → kullanıcının **tüm** token kayıtları silinir. |

Belirli cihazı silmek için:

```json
{ "expoPushToken": "ExponentPushToken[xxxx]" }
```

**Başarılı (`200`):** `{ "ok": true, "message": "Kayıt silindi" }`

---

## 6) Push bildiriminde `data` alanı (iş mantığı)

Sunucu Expo mesajına `data` ekler. Uygulamada `addNotificationResponseReceivedListener` / `getLastNotificationResponseAsync` ile okuyabilirsiniz.

### 6.1 Takvim (`type: 'calendar'`)

```json
{
  "type": "calendar",
  "eventId": 42,
  "offset": "24h"
}
```

`offset` değerleri: `"24h"` \| `"6h"` \| `"1h"` \| `"15m"`

**UX önerisi:** `eventId` ile yerel cache veya `GET /api/calendar/events?year=&month=` sonucundan ilgili ayı çekip detay ekranına yönlendirin.

### 6.2 Su (`type: 'water'`)

```json
{
  "type": "water",
  "hour": 10
}
```

`hour`: İstanbul saati (0–23). Basit hatırlatma ekranı veya sessiz bildirim yeterli olabilir.

---

## 7) Takvim REST API (hatırlatma içeriği ile ilişki)

Takvim uçları **`apis.md`** içinde tam listelenmemiş olabilir; backend’de şu önekler vardır (JWT gerekli):

- `GET /api/calendar/events?year=2026&month=4`
- `POST /api/calendar/events` — gövde: `title`, `notes`, `kind` (`event` \| `medication` \| `reminder`), `event_date` (`YYYY-MM-DD`), `event_time` (isteğe bağlı `HH:mm` — **hatırlatmalar için zorunlu**)

Mobil, kullanıcıya gösterilen başlık/açıklama için bu kayıtları kullanır; hatırlatma metinleri sunucuda Türkçe üretilir.

---

## 8) E-posta içeriği (bilgi)

Kullanıcı aynı olay için e-postada daha ayrıntılı HTML metin alır; push’ta kısa başlık/gövde kullanılır. Tasarım değişiklikleri backend `backend/lib/notify/reminderWorker.js` ve `mail.js` üzerinden yapılır — mobil kodu değiştirmeyi gerektirmez.

---

## 9) Sunucu saati (makine saati)

Hatırlatmalar **İstanbul saatine** göre hesaplanır (`luxon` + `node-cron` `Europe/Istanbul`). Windows’un bölgesel saat dilimi ayarından bağımsızdır; ancak **bilgisayarın / VDS’nin sistem saati (RTC) yanlışsa** (NTP kapalı, pil bitmiş vb.) hem `DateTime.now()` hem cron **aynı şekilde yanlış** olur.

- VDS / sunucuda **NTP / otomatik saat senkronu** açık olsun.
- Kontrol: `GET /api/health` yanıtındaki `clock_istanbul` ile gerçek İstanbul saatini karşılaştırın; `clock_utc` ile UTC tutarlılığını görün.

---

## 10) Hata ayıklama kontrol listesi

1. MySQL’de `notify_support.sql` uygulandı mı?  
2. `.env` içinde `MAIL_USER` / `MAIL_PASS` doğru mu? **Backend’i `.env` değişince yeniden başlatın** (SMTP transporter ilk kullanımda oluşur).  
3. Sunucu logunda `✅ Bildirim e-postası (SMTP) yapılandırıldı` görünüyor mu?  
4. Takvim testi: ilgili kullanıcıda **`users.email` dolu mu?**  
5. Aynı hatırlatmayı tekrar denemek için `notification_sent_log` içindeki `dedupe_key` (örn. `ce:<eventId>:15m`) satırını silmeniz gerekebilir.  
6. `DISABLE_NOTIFY_CRON=1` yanlışlıkla açık mı?  
7. Mobil `POST /api/notify/register-device` **401** dönüyorsa JWT süresi dolmuş olabilir (login: 24 saat).  
8. Expo tarafında fiziksel cihazda test edin; emülatör kısıtları olabilir.

---

## 11) Güvenlik notu

- JWT ve push token’ları loglara yazmayın.  
- Gmail uygulama şifresini **asla** repoya veya istemci koduna koymayın; sadece sunucu `.env`.  
- Üretimde mümkünse **HTTPS** ve güvenlik duvarı kuralı kullanın (`apis.md`).

---

*Bu dosya `backend/server.js`, `backend/lib/notify/*` ve `database/notify_support.sql` ile uyumludur; davranış değişirse güncelleyin.*
