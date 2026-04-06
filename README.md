## Ostim Tech - Google Developer Groups Hackathon '26   04-05.04.2026


# CodeX HealthCare

A **user-centric health assistant web application**: medication and laboratory report analysis, symptom screening, calendar reminders, nearby healthcare facilities (map), games, and profile management. This repository contains the **frontend (React)**, **backend (Node.js API)**, and **MySQL** database.

> **Important:** The application is for informational and educational purposes only; it is not a substitute for medical diagnosis or treatment. In emergencies, call **112**.

---

## Table of Contents

- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [External Services and APIs](#external-services-and-apis)
- [Project Structure](#project-structure)
- [Database](#database)
- [Requirements](#requirements)
- [Local Development](#local-development)
- [Production Environment (Summary)](#production-environment-summary)
- [Environment Variables](#environment-variables)
- [Documentation](#documentation)

---

## Key Features

| Area | Description |
|------|-------------|
| Authentication | Registration / login, JWT-based sessions |
| Medication | Text or image-based search / analysis (Gemini) |
| Laboratory | PDF/image report upload and AI summary |
| Screening | Scenario-based symptom screening from database |
| Calendar | User events; email + optional Expo push reminders |
| Notification | SMTP (Nodemailer), cron (Istanbul timezone), Expo push token registration |
| Map | OpenStreetMap + Leaflet; nearby hospitals/pharmacies via Overpass |
| On-Duty Pharmacy | Third-party embedded view (`eczaneler.gen.tr`) |
| Games | Score saving and history |
| Location | GPS over HTTPS; otherwise IP-based approximate location services |

---

## Technology Stack

### Languages

- **JavaScript (ES modules)** — frontend
- **JavaScript (CommonJS)** — backend
- **SQL (MySQL / MariaDB compatible)** — schema and migrations
- **HTML / CSS** — entry point, Tailwind-generated styles

### Frontend

| Technology | Usage |
|------------|-------|
| **React 19** | UI components |
| **Vite 8** | Build, dev server, HMR |
| **Tailwind CSS 4** | Utility-first styling |
| **Axios** | HTTP client (REST API) |
| **lucide-react** | Icon set |
| **Google Fonts** | Manrope, Inter, Material Symbols |

### Backend

| Technology | Usage |
|------------|-------|
| **Node.js** | Runtime environment |
| **Express 5** | HTTP API, middleware, file upload |
| **mysql2** | MySQL connection pool, async queries |
| **jsonwebtoken** | JWT generation and verification |
| **bcryptjs** | Password hashing |
| **multer** | Multipart (report / medication image) |
| **dotenv** | Environment variables |
| **cors** | Cross-origin requests |
| **@google/generative-ai** | Text/image analysis with Google Gemini |
| **nodemailer** | Reminder emails via SMTP |
| **node-cron** | Scheduled tasks (reminder loop) |
| **luxon** | Date/time (Istanbul timezone) |

### Map and Media (Client)

- **Leaflet 1.9** (CDN) — interactive map
- **OpenStreetMap** tiles — map imagery

---

## External Services and APIs

| Service | Purpose |
|---------|---------|
| **Google Gemini** | Medication, report, and screening interpretations (backend) |
| **Gmail SMTP** (or compatible SMTP) | Reminder emails |
| **Expo Push API** | Mobile push notifications (to devices with registered tokens) |
| **Overpass API** (`overpass-api.de`) | Nearby POI queries from OSM |
| **ipwho.is / geojs.io** | Approximate location (HTTPS client-side) |
| **eczaneler.gen.tr** | On-duty pharmacy iframe embeddable content |

In production, it is recommended that these services are accessible and use **HTTPS** where possible.

---

## Project Structure

```
CodeX-HealthCare/
├── frontend/                 # React + Vite
│   ├── public/               # Static files (logo.jpeg, favicon, .htaccess)
│   ├── src/
│   │   ├── App.jsx           # Main application and routes (tab-based)
│   │   ├── config.js         # VITE_API_URL base address
│   │   └── components/       # Sub-components (calendar, games, on-duty embed, etc.)
│   ├── index.html
│   └── package.json
├── backend/
│   ├── server.js             # Express application and REST endpoints
│   ├── lib/notify/           # Mail, Expo push, reminder worker
│   ├── scripts/              # Utility Node scripts
│   └── package.json
├── database/                 # SQL schema and maintenance scripts
├── apis.md                   # REST API reference
├── mail_notify.md            # Email and push reminders
└── README.md                 # This file
```

---

## Database

Runs on MySQL (or MariaDB). Sample files are located under `database/`:

| File | Content |
|------|---------|
| `init.sql` | Core tables (users, game scores, interactions, etc.) |
| `calendar_events.sql` | User calendar events |
| `symptom_screening.sql` | Symptom screening scenarios |
| `notify_support.sql` | Expo token + reminder dedupe log table |
| `drop_nobetci_eczane.sql` | Removes legacy on-duty pharmacy table (if used) |
| `drop_notification_inbox_columns.sql` | Optional column cleanup |

Typical order: `init.sql` first, then feature files; refer to `apis.md` and existing `server.js` queries for details.

---

## Requirements

- **Node.js** (LTS recommended, e.g. 20.x or 22.x)
- **npm**
- **MySQL 8** or compatible **MariaDB**
- Relevant **accounts / keys** for Google Gemini and SMTP (via `.env` in production)

---

## Local Development

### 1. Database

Create a database in MySQL and import the appropriate `.sql` files from the `database/` directory.

### 2. Backend

```bash
cd backend
cp .env.example .env   # or create the .env file manually
npm install
npm start
```

Default listening address: **`http://127.0.0.1:5000`** (HTTP). `PORT`, `BIND_HOST`, `DB_*`, `JWT_SECRET`, `GEMINI_API_KEY`, etc. are configured via `.env`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` requests to `http://127.0.0.1:5000` via `vite.config.js`.

Production build:

```bash
cd frontend
npm run build
```

Output: `frontend/dist/` — served via static hosting or reverse proxy.

### 4. API Address (Production)

Before building, set in `frontend/.env.production` or the environment:

`VITE_API_URL=https://yourdomain.com/api`

(With `/api` at the end, no trailing slash; refer to `config.js` logic if using a root domain.)

---

## Production Environment (Summary)

Typical setup:

1. **Node** process: `npm start` in the `backend` folder (or PM2/systemd).
2. **TLS**: Let's Encrypt or hosting certificate for the domain; serve over **HTTPS**.
3. **Reverse proxy** (Apache / nginx): `/api` → Node backend; static files → `dist`.
4. In the firewall, only **80/443** exposed externally if needed; Node can listen internally on `127.0.0.1` (`BIND_HOST=127.0.0.1`).

---

## Environment Variables

### Backend (`.env`) — example fields

| Variable | Description |
|----------|-------------|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `PORT`, `BIND_HOST` | Server port and listening interface |
| `JWT_SECRET` | JWT signature (keep strong and secret) |
| `GEMINI_API_KEY` | Google Generative AI |
| `MAIL_USER`, `MAIL_PASS`, … | SMTP (reminders) |
| `DISABLE_NOTIFY_CRON` | If `1`, disables the per-minute reminder cron |
| `WATER_REMINDER_FIRST_HOUR`, `WATER_REMINDER_LAST_HOUR` | Water reminder time range |

For the full list and behavior, refer to `mail_notify.md` and usages within `server.js`.

---

## Documentation

| File | Content |
|------|---------|
| **apis.md** | REST endpoints, JWT, multipart fields, example requests |
| **mail_notify.md** | Email reminders, Expo push, cron, troubleshooting |

---

## Developer Team
 - Yusuf Türker ALBAYRAK [https://github.com/TurkerAlbayrak]
 - Hasan Erman DAĞ [https://github.com/hasanerman]
 - Mir Mehmet PEKER [https://github.com/mirmehmet]
