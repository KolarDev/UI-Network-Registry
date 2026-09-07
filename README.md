# University of Ibadan — Network Service Registry & Admin Portal

[![Laravel 12](https://img.shields.io/badge/Laravel-12-FF2D20?logo=laravel)](https://laravel.com)
[![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind 4](https://img.shields.io/badge/Tailwind-4-0EA5E9?logo=tailwindcss)](https://tailwindcss.com)
[![AWS S3](https://img.shields.io/badge/AWS_S3-Ready-FF9900?logo=amazonaws)](https://aws.amazon.com/s3)
[![MySQL](https://img.shields.io/badge/MySQL-Ready-4479A1?logo=mysql)](https://www.mysql.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

A production-ready, full-stack **Network Service Registry** for the University of Ibadan
Information Technology & Media Services (ITMS). Staff register for the campus
network service, get a public **Tracking ID**, communicate with ITMS admins
through a built-in chat thread, and ITMS operators review, verify, and lock
applications through a dedicated **Admin Portal**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Environment Configuration Guide](#3-environment-configuration-guide)
4. [Setup & Runbook](#4-setup--runbook)
5. [Role & Pricing Matrix](#5-role--pricing-matrix)
6. [Tracking & Messaging Workflow](#6-tracking--messaging-workflow)
7. [API Reference](#7-api-reference)
8. [Project Structure](#8-project-structure)
9. [Testing & Quality Gates](#9-testing--quality-gates)
10. [Deployment Notes](#10-deployment-notes)
11. [Contributing & License](#11-contributing--license)

---

## 1. Project Overview

The portal is composed of two faces that share one backend:

| Surface | Audience | URL | Purpose |
| --- | --- | --- | --- |
| **Registration Portal** | University staff | `/` | 4-step wizard, document upload, tracking lookup, edit & chat |
| **Admin Portal** | ITMS support staff | `/ui-admin` | Review submissions, toggle status, chat with users, export CSV |

### Key Features

- **Multi-step registration wizard** — Role → Profile → Credentials → Billing/Documents → Review
- **Tracking ID system** — Each submission gets a clean, unique 8-character code
  (e.g. `UIN-7X9B2K`) printed on every receipt and used to look up status.
- **Document upload with image-only validation** — JPEG/PNG only, 5 MB ceiling.
- **Storage abstraction** — `local` disk in dev, **AWS S3** in production, with no
  application code changes.
- **Status workflow** — `pending` → `in_review` → `completed` (admin-toggleable,
  user-side "edit" auto-locks once `completed`).
- **Built-in support messaging** — Threaded chat per registration; both parties
  can post text + image attachments.
- **Admin Dashboard** — Filterable table, paginated, CSV export, per-record
  status dropdowns, inline chat drawer.
- **Production-grade database switching** — SQLite in dev, MySQL in production,
  driven entirely by `DB_CONNECTION`.

---

## 2. Architecture & Tech Stack

```
┌──────────────────────────────────────────────────────────┐
│  Browser (React 19 + TypeScript + Tailwind 4)            │
│  - Vite 7 build → public/build/                          │
└────────────┬─────────────────────────────────────────────┘
             │ fetch / FormData (XHR)
             ▼
┌──────────────────────────────────────────────────────────┐
│  Laravel 12 (PHP 8.2+)                                   │
│  ├─ Routes  (routes/api.php, routes/web.php)             │
│  ├─ Controllers  (app/Http/Controllers/)                 │
│  ├─ Models   (app/Models/StaffRegistration, etc.)        │
│  └─ Migrations  (database/migrations/)                   │
└────────────┬───────────────────┬──────────────────────────┘
             │                   │
             ▼                   ▼
   ┌─────────────────┐   ┌────────────────────────────┐
   │  SQLite  (dev)  │   │  MySQL  (production)       │
   └─────────────────┘   └────────────────────────────┘

   ┌─────────────────┐   ┌────────────────────────────┐
   │  Local Disk     │   │  AWS S3 Bucket             │
   │  (dev)          │   │  (production)              │
   └─────────────────┘   └────────────────────────────┘
```

**Backend**
- PHP 8.2+
- Laravel 12
- `league/flysystem-aws-s3-v3` (AWS SDK v3 Flysystem adapter for S3)

**Frontend**
- React 19 + TypeScript 5
- Vite 7 + `@vitejs/plugin-react`
- Tailwind 4 (via `@tailwindcss/vite`)

**Tooling**
- `pint` — Laravel code style
- `phpunit` — Backend tests
- `tsc --noEmit` — TypeScript checks
- `vite build` — Production bundle

---

## 3. Environment Configuration Guide

All configuration is driven by a single `.env` file at the repository root.
A complete template lives in `.env.example`. Copy it before your first run:

```bash
cp .env.example .env
```

### 3.1 Application core

| Key | Required | Description |
| --- | --- | --- |
| `APP_NAME` | ✓ | Display name (e.g. `UI Network Registry`). |
| `APP_ENV` | ✓ | `local` for development, `production` for live. |
| `APP_KEY` | ✓ | Generated via `php artisan key:generate`. |
| `APP_DEBUG` | ✓ | `true` locally, `false` in production. |
| `APP_URL` | ✓ | Base URL (e.g. `https://registry.ui.edu.ng`). |

### 3.2 Database — `dev` vs `prod`

#### Development (SQLite)

The default `.env.example` ships with SQLite. **No extra setup is required** —
Laravel creates `database/database.sqlite` on the first migration.

```dotenv
APP_ENV=local
DB_CONNECTION=sqlite
# DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD are ignored.
```

#### Production (MySQL)

Switch the environment to MySQL by setting the variables below. The
`config/database.php` MySQL block automatically reads them; **no code changes
are needed**.

```dotenv
APP_ENV=production
DB_CONNECTION=mysql
DB_HOST=db.ui-network.internal
DB_PORT=3306
DB_DATABASE=ui_network_registry
DB_USERNAME=ui_network
DB_PASSWORD=           # supply via secrets manager / vault
```

Optional MySQL SSL: `MYSQL_ATTR_SSL_CA=/path/to/ca.pem` is honoured by
`config/database.php`.

### 3.3 Storage — Local Disk vs AWS S3

The default storage disk is **derived automatically** from `APP_ENV`:

| `APP_ENV` | Default disk (when `FILESYSTEM_DISK` is unset) | Backing store |
| --- | --- | --- |
| `local` (or any other) | `public` | `storage/app/public` |
| `production` | `s3` | AWS S3 bucket |

You can override at any time with `FILESYSTEM_DISK=s3` (or `public`) in `.env`.

#### AWS S3 credentials (production)

```dotenv
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_DEFAULT_REGION=eu-west-1
AWS_BUCKET=ui-network-registry-uploads
AWS_URL=https://ui-network-registry-uploads.s3.eu-west-1.amazonaws.com
# Optional — only if using an S3-compatible endpoint (MinIO, DigitalOcean Spaces, etc.)
# AWS_ENDPOINT=https://nyc3.digitaloceanspaces.com
# AWS_USE_PATH_STYLE_ENDPOINT=true
```

> **Tip:** When the bucket is private, swap `s3` → `s3` with a CloudFront
> distribution in front and set `AWS_URL` to the CDN hostname.

#### Local-disk credentials (development)

No credentials required. Files land in `storage/app/public/`. After the first
install, expose them via the symbolic link:

```bash
php artisan storage:link
```

### 3.4 Mail, Queue, Cache, Session

Defaults are fine for development (log mailer, database queue, database cache,
database session). In production, switch to Redis / SQS / SES via the
standard `MAIL_*`, `QUEUE_CONNECTION`, `CACHE_STORE`, `SESSION_DRIVER` knobs.

---

## 4. Setup & Runbook

> **Prerequisites:** PHP ≥ 8.2, Composer ≥ 2.5, Node.js ≥ 20, npm ≥ 10,
> (for production) MySQL ≥ 8.0 and an S3 bucket.

### 4.1 First-time setup (local dev)

```bash
# 1. Clone & enter the repo
git clone <repo-url> ui-network-registry
cd ui-network-registry

# 2. Backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link          # exposes uploaded files at /storage/...
php artisan db:seed               # (optional) seed an admin user

# 3. Frontend
npm install
npm run build                     # production bundle → public/build/
# or, for hot reload:
npm run dev

# 4. Run the dev server
php artisan serve                 # http://127.0.0.1:8000
```

### 4.2 Useful artisan commands

| Command | Purpose |
| --- | --- |
| `php artisan migrate` | Run pending migrations |
| `php artisan migrate:fresh --seed` | **DESTRUCTIVE** — rebuild DB + seed |
| `php artisan storage:link` | Symlink `public/storage` → `storage/app/public` |
| `php artisan config:clear` | Clear cached config |
| `php artisan route:clear` | Clear cached routes |
| `php artisan view:clear` | Clear compiled Blade views |
| `php artisan queue:work` | Process queued jobs (mail, exports) |
| `php artisan test` | Run PHPUnit |
| `vendor/bin/pint` | Format PHP code per Laravel style |
| `npm run build` | Build the Vite production bundle |
| `npm run dev` | Vite dev server (HMR) |
| `npx tsc --noEmit` | TypeScript type check |

### 4.3 Production build & deploy (sketch)

```bash
# on the server, after `git pull`
composer install --optimize-autoloader --no-dev
npm ci && npm run build
php artisan migrate --force
php artisan config:cache route:cache view:cache
php artisan storage:link
# (re)start php-fpm / queue workers / scheduler
```

---

## 5. Role & Pricing Matrix

| Role | Who it's for | Required structural inputs | Monthly fee |
| --- | --- | --- | --- |
| **Staff** | Academic & Non-Teaching employees of a faculty/department | Full Name • Staff ID • **Designation** (Academic/Non-Teaching) • Phone • Faculty • Department | **₦1,000** |
| **Dean** | Faculty-level administrator | Full Name • Staff ID • Phone • **Faculty** | **₦2,000** |
| **HOD** | Head of Department | Full Name • Staff ID • Phone • **Faculty** • **Department** | **₦2,000** |
| **Director** | Executive director of a directorate / main unit | Full Name • Staff ID • Phone • **Department (Directorate Unit)** | **₦1,000** |

### Billing terms (as displayed in the wizard)

- Monthly deductions are processed via salary.
- Three (3) months' notice is required to unsubscribe.
- A **₦2,000 reactivation fee** applies if access is suspended and re-requested.
- All charges are subject to change by ITMS administration.

### Validation rules

- `fullName` — required, min 3 chars
- `staffId` — must match `^UI/STF/\d+$`, unique
- `phone` — Nigerian number: `^(?:\+234|0)[789][01]\d{8}$`
- `username` — lowercase letters / numbers / `.` `-` `_`, unique
- `password` — min 8 chars (set at registration; never re-validated on edit)
- `staffIdFile`, `payslipFile`, chat `attachment` — JPEG/PNG, ≤ 5 MB

---

## 6. Tracking & Messaging Workflow

### 6.1 For the user

```
┌───────────────┐   submit    ┌──────────────────┐
│  Wizard (4    │ ──────────▶ │  staff_registrations │
│  steps + rev) │             │  + tracking_id   │
└───────┬───────┘             └────────┬─────────┘
        │                              │
        ▼                              ▼
   Copy Tracking ID            Look up via:
   UIN-7X9B2K                  • Header "Track Application" input
                               • POST /api/track/{id}
```

The **header bar** at the top of the homepage accepts a Tracking ID and
loads a real-time dashboard with:

- Current status badge + live 3-step timeline
- Profile details
- Edit Application button (greyed out when `status === 'completed'`)
- Locked badge when finalized
- ITMS support chat thread (text + image attachments)

### 6.2 For ITMS admins

After logging in at `/ui-admin`, the **Admin Dashboard** shows every
submission. From each row the admin can:

- Change status via the inline **dropdown** (or the modal selector)
- Open the **Messages / Chat** drawer to converse with the user
- Preview / download the staff ID and payslip images

Marking a record **Completed** automatically:
- Locks the form so the user can no longer edit (server returns 403 on `PUT`)
- Surfaces a "Locked" badge on both the tracking page and the admin view

### 6.3 Status state machine

```
              ┌──────────────┐
              │   pending    │  ◀── default on submit
              └──────┬───────┘
                     │ admin: PATCH /api/admin/registrations/{id}/status
                     ▼
              ┌──────────────┐
              │  in_review   │
              └──────┬───────┘
                     │ admin toggle
                     ▼
              ┌──────────────┐
              │  completed   │  ◀── terminal; user edit locked
              └──────────────┘
```

> Admins can move freely between `in_review` and `completed` to re-open a
> case if a follow-up is required.

---

## 7. API Reference

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/register` | public | Create a new registration (returns `tracking_id`) |
| `GET` | `/api/track/{tracking_id}` | public | Lookup status, profile, message thread |
| `PUT` | `/api/registrations/{id}` | public | Edit form fields; **403** if `status === 'completed'` |
| `POST` | `/api/track/{tracking_id}/messages` | public | Post a message (text + optional image); sender determined by bearer token |
| `PATCH` | `/api/admin/registrations/{id}/status` | admin | Toggle status to `in_review` or `completed` |
| `GET` | `/api/admin/login` | public | Authenticate admin |
| `GET` | `/api/admin/submissions` | admin | Paginated, filterable list |
| `GET` | `/api/admin/submissions/export` | admin | Stream CSV export |
| `GET` | `/api/admin/submissions/file` | admin | Stream / preview a stored document |

Admin authentication is enforced by either a Laravel session or a shared
bearer/query token (`mock-admin-session-token`).

---

## 8. Project Structure

```
ui-network-registry/
├── app/
│   ├── Http/Controllers/
│   │   ├── AdminAuthController.php
│   │   ├── AdminSubmissionController.php
│   │   └── RegistrationController.php   ← public + status endpoints
│   └── Models/
│       ├── StaffRegistration.php       ← tracking_id generator, statuses
│       ├── RegistrationMessage.php     ← chat thread model
│       └── User.php
├── bootstrap/
├── config/
│   ├── database.php                    ← MySQL + SQLite connections
│   ├── filesystems.php                 ← s3 / public disk selection
│   └── ...
├── database/
│   └── migrations/
│       ├── 0001_01_01_000000_create_users_table.php
│       ├── 2026_07_15_000000_create_staff_registrations_table.php
│       └── 2026_09_07_000000_create_registration_messages_table.php
├── public/
│   ├── build/                          ← Vite output
│   └── images/ui-logo.png
├── resources/
│   ├── css/app.css
│   ├── js/
│   │   ├── app.tsx                     ← root component, view routing
│   │   ├── components/
│   │   │   ├── AdminDashboard.tsx      ← status controls + chat drawer
│   │   │   ├── AdminLogin.tsx
│   │   │   ├── ChatThread.tsx          ← shared message component
│   │   │   ├── ImagePreviewModal.tsx
│   │   │   ├── RegistrationForm.tsx    ← 4-step wizard + edit-mode
│   │   │   ├── StatusTimeline.tsx
│   │   │   └── TrackingLookup.tsx      ← search + dashboard
│   │   └── layouts/
│   └── views/app.blade.php
├── routes/
│   ├── api.php
│   └── web.php
├── storage/
├── tests/
├── .env.example                        ← full environment template
├── composer.json
├── package.json
├── tsconfig.json
└── vite.config.js
```

---

## 9. Testing & Quality Gates

| Check | Command |
| --- | --- |
| Backend tests | `vendor/bin/phpunit` |
| PHP code style | `vendor/bin/pint` |
| TypeScript check | `npx tsc --noEmit` |
| Production build | `npm run build` |
| Migrations roll forward | `php artisan migrate` |
| **Destructive** rebuild | `php artisan migrate:fresh` |

The test suite ships with example Feature tests covering the registration
endpoint and the admin auth flow. Add additional tests under
`tests/Feature/` mirroring the controller layout.

---

## 10. Deployment Notes

- **File storage in production must be S3** (or a compatible store). The
  default `public` disk is not designed to be shared across multiple PHP-FPM
  workers behind a load balancer.
- **Sessions, cache, and queue** should be moved off the `database` driver to
  Redis in production for predictable performance.
- **`APP_DEBUG` must be `false`** in production — it leaks environment
  details to the browser on errors.
- **`php artisan storage:link`** is harmless on S3 (it just creates a
  public/storage symlink) but required for local-disk previewing.
- **S3 bucket policy** — the bucket only needs to be readable by your CDN
  / CloudFront distribution; uploads use the IAM key/secret pair.
- **Backups** — schedule daily `mysqldump` of `ui_network_registry` plus an
  S3 lifecycle rule to transition uploads to Glacier after 90 days.

---

## 11. Contributing & License

Issues and pull requests are welcome. Please run `vendor/bin/pint` and the
test suite before submitting.

This project is released under the **MIT License** — see [LICENSE](LICENSE)
for details.
