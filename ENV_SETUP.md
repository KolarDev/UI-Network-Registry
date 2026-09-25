# Environment Setup & Deployment Guide (`ENV_SETUP.md`)

This guide explains how the University of Ibadan Network Registry system switches seamlessly between **Development** and **Production** environments via `.env` configuration flags, and provides production deployment templates and runbooks.

---

## 1. Environment Switch Architecture

The backend is architected to be completely environment-agnostic. By toggling variables in `.env`, you can switch database engines, storage drivers, log levels, and application debugging without altering a single line of application source code.

### Summary of Environment Switches

| Feature / Subsystem | Local Development | Production | `.env` Variable |
| :--- | :--- | :--- | :--- |
| **Application Mode** | `local` | `production` | `APP_ENV` |
| **Debug Mode** | `true` (detailed stack trace) | `false` (generic error page) | `APP_DEBUG` |
| **Database Engine** | `sqlite` (`database.sqlite`) | `mysql` / `pgsql` / `mariadb` | `DB_CONNECTION` |
| **File Storage** | `public` (`storage/app/public`) | `s3` (AWS S3) or `public` | `FILESYSTEM_DISK` |
| **Session Driver** | `database` or `file` | `database` or `redis` | `SESSION_DRIVER` |
| **Queue Connection** | `database` or `sync` | `database` or `redis` | `QUEUE_CONNECTION` |
| **Cache Store** | `database` or `file` | `database` or `redis` | `CACHE_STORE` |
| **Log Level** | `debug` | `error` or `info` | `LOG_LEVEL` |

---

## 2. Environment Switches in Detail

### 2.1 Toggling `APP_ENV` & `APP_DEBUG`
- **Development (`APP_ENV=local`, `APP_DEBUG=true`)**: Enables detailed exception stack traces, Vite hot reloading, and verbose JSON debugging responses.
- **Production (`APP_ENV=production`, `APP_DEBUG=false`)**: Suppresses internal server error details in responses to prevent credential leaks, and optimizes framework performance.

### 2.2 Toggling `DB_CONNECTION`
- **Default SQLite (`DB_CONNECTION=sqlite`)**:
  - Automatically targets `database/database.sqlite` via `database_path('database.sqlite')` defined in `config/database.php`.
  - Zero-configuration setup, ideal for local testing, CI/CD pipelines, and standalone demonstration.
- **Production MySQL / MariaDB (`DB_CONNECTION=mysql`)**:
  - Utilizes standard host, port, database, username, and password parameters.
  - Supports SSL connections (`MYSQL_ATTR_SSL_CA`).
- **Production PostgreSQL (`DB_CONNECTION=pgsql`)**:
  - Simply set `DB_CONNECTION=pgsql` and specify port `5432` with your database credentials.

### 2.3 File Storage Driver Abstraction (`FILESYSTEM_DISK`)
- **Local Public Storage (`FILESYSTEM_DISK=public`)**:
  - Files uploaded via `/api/register` are stored in `storage/app/public/uploads/staff_ids` and `storage/app/public/uploads/payslips`.
  - Symlinked to `public/storage` via `php artisan storage:link`, enabling instant browser preview and downloads without cloud overhead.
- **Cloud Object Storage (`FILESYSTEM_DISK=s3`)**:
  - By setting `FILESYSTEM_DISK=s3` and supplying `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_BUCKET`, files are automatically stored directly in your AWS S3 bucket or compatible S3 provider (Cloudflare R2, MinIO, DigitalOcean Spaces) without any controller code modifications.

---

## 3. Production Deployment `.env` Template

Copy this template to `.env` on your production server:

```ini
APP_NAME="UI Network Registry"
APP_ENV=production
APP_KEY=base64:GENERATE_WITH_PHP_ARTISAN_KEY_GENERATE
APP_DEBUG=false
APP_URL=https://network-registry.ui.edu.ng

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

LOG_CHANNEL=stack
LOG_STACK=daily
LOG_LEVEL=error

# ==========================================
# Database Configuration (MySQL / PostgreSQL)
# ==========================================
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ui_network_registry
DB_USERNAME=ui_net_user
DB_PASSWORD=SecureProductionPassword123!
# DB_SOCKET=

# If using PostgreSQL instead, uncomment:
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=ui_network_registry
# DB_USERNAME=ui_net_user
# DB_PASSWORD=SecureProductionPassword123!

# ==========================================
# Storage & Driver Configuration
# ==========================================
# Set to 'public' for local symlinked storage, or 's3' for AWS S3 cloud storage
FILESYSTEM_DISK=public

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

QUEUE_CONNECTION=database
CACHE_STORE=database

# ==========================================
# AWS S3 Cloud Storage (If FILESYSTEM_DISK=s3)
# ==========================================
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

# ==========================================
# Mail Configuration (ITMS Notifications)
# ==========================================
MAIL_MAILER=smtp
MAIL_HOST=smtp.ui.edu.ng
MAIL_PORT=587
MAIL_USERNAME=notifications@ui.edu.ng
MAIL_PASSWORD=YourMailPassword
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="no-reply-network@ui.edu.ng"
MAIL_FROM_NAME="UI ITMS Network Unit"

# ==========================================
# Frontend Configuration
# ==========================================
VITE_APP_NAME="${APP_NAME}"
```

---

## 4. Local Development `.env` Template

For local development or testing with SQLite:

```ini
APP_NAME="UI Network Registry"
APP_ENV=local
APP_KEY=base64:1W8gBRSB+cquFUpz0H7NVZwdyKx7ipuSvO6yk0scQrc=
APP_DEBUG=true
APP_URL=http://localhost:8000

LOG_CHANNEL=stack
LOG_LEVEL=debug

# Default SQLite Connection
DB_CONNECTION=sqlite

# Local Public Storage (storage/app/public -> public/storage)
FILESYSTEM_DISK=public

SESSION_DRIVER=database
SESSION_LIFETIME=120
QUEUE_CONNECTION=database
CACHE_STORE=database

MAIL_MAILER=log
VITE_APP_NAME="${APP_NAME}"
```

---

## 5. Deployment & Execution Runbook

Follow these commands to deploy the application on a new server or switch environments:

### Step 1: Install Dependencies
```bash
# Install PHP Composer dependencies (optimized for production)
composer install --no-dev --optimize-autoloader

# Install Node dependencies and compile frontend assets statically
npm ci
npm run build
```

### Step 2: Configure `.env` & Generate Key
```bash
cp .env.example .env
# Edit .env with your production database credentials
php artisan key:generate
```

### Step 3: Run Database Migrations & Seed Default Admin
```bash
# Run migrations to build the users, sessions, and staff_registrations tables
php artisan migrate --force

# Seed the default admin user and initial datasets
php artisan db:seed --force
```

### Step 4: Link Storage for Public Document Access
```bash
# Creates the symbolic link from public/storage to storage/app/public
php artisan storage:link
```

### Step 5: Optimize Framework Caches for Production
```bash
# Cache configuration, routes, and compiled views for maximum performance
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Step 6: Verify Permissions
Ensure the web server user (`www-data` or `nginx`) has write permissions to:
```bash
chmod -R 775 storage bootstrap/cache database
chown -R www-data:www-data storage bootstrap/cache database
```

---

## 6. Password Visibility for Network Engineers

The database schema and API endpoints are configured to support ITMS network provisioning workflows:
- **Unhashed Preferred Password**: Saved in the `default_password_text` column on the `staff_registrations` table.
- **Admin Visibility**: Returned as `default_password_text` and `preferred_password` in `/api/admin/submissions`.
- **Export Utility**: Included in the downloadable CSV export (`/api/admin/submissions/export`) for bulk network provisioning.

---

## 7. PHP Upload Limits (required for document uploads)

A registration submits two documents of up to **5MB** each, so PHP must be
allowed to receive them. With the stock `upload_max_filesize = 2M`, PHP rejects
a larger file *before* Laravel runs: the request looks like a missing upload, and
the API can only answer with a server-limit message instead of validating the
file. With a low `post_max_size`, two valid 5MB files (10MB together) are
rejected outright with HTTP 413.

Required values:

```ini
upload_max_filesize = 6M    ; headroom above the 5MB per-file limit
post_max_size       = 16M   ; both documents plus multipart overhead
```

**Apache (mod_php):** already set in `public/.htaccess`.

**php-fpm / shared hosting:** `php_value` in `.htaccess` is ignored, so set the
values in `php.ini` or the pool config (`/etc/php/*/fpm/php.ini`), then restart
the service.

**Local development (`php artisan serve`)** uses the CLI `php.ini`, which the
project cannot override. Either raise the limits in that `php.ini` or start the
server with them inline:

```bash
php -d upload_max_filesize=6M -d post_max_size=16M artisan serve
```

Verify the effective values at any time:

```bash
php -r 'echo ini_get("upload_max_filesize"), " / ", ini_get("post_max_size"), PHP_EOL;'
```

---

## 8. Administrator Credentials

The seeder creates the administrator account used by the admin console:

| Field    | Value               |
| -------- | ------------------- |
| Email    | `admin@ui.edu.ng`   |
| Username | `admin`             |
| Password | `password`          |

`POST /api/admin/login` accepts either the email or the username in the `email`
or `username` field. The seeder is idempotent (`php artisan db:seed` repairs a
missing or renamed admin without duplicating data).

On success the endpoint returns a random, session-bound API token. The token is
only valid alongside the session it was issued to, so it cannot be reused as a
shared password. **Change the seeded password before deploying to production.**
