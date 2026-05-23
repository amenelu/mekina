# Staging Setup

This app should use staging before production so the Expo web build, backend API,
database migrations, uploads, CORS, and Socket.IO behavior can be tested against
real deployed services.

## Recommended Targets

- Backend API: a staging Flask service such as `https://api-staging.example.com`.
- Expo web: a staging static web host such as `https://web-staging.example.com`.
- Database now: SQLite on a persistent backend disk or volume.
- Database later: managed PostgreSQL using the same `DATABASE_URL` setting.
- Uploads/media: persistent storage mounted to `static/uploads`, or object
  storage later when the app outgrows local disk.

Do not reuse the production database, production uploads, or production secrets
for staging.

## Backend Environment

Set these values on the staging backend host:

```env
APP_ENV=staging
FLASK_APP=run.py
FLASK_DEBUG=false
SECRET_KEY=<strong-staging-secret>
DATABASE_URL=sqlite:////persistent/mekina/database.db
CORS_ALLOWED_ORIGINS=https://web-staging.example.com
PASSWORD_RESET_BASE_URL=https://web-staging.example.com
PASSWORD_RESET_EXPIRATION_MINUTES=30
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=Lax
JWT_EXPIRATION_DAYS=30
MAX_CONTENT_LENGTH=16777216
```

`APP_ENV=staging` uses the same deployment safety checks as production. The app
will refuse to boot without `SECRET_KEY`, `DATABASE_URL`, and
`CORS_ALLOWED_ORIGINS`.

Password reset links are generated from `PASSWORD_RESET_BASE_URL`. Configure
SMTP before public launch; without SMTP, reset links are written to backend logs
for staging/debugging only. In non-production, the API reports that email
delivery is not configured so the reset button does not silently pretend an
email was sent.

The SQLite path must point to a persistent backend disk. Do not keep the staging
database only inside an ephemeral deploy directory.

When moving to PostgreSQL later, keep the app code the same and change only the
database URL:

```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<host>:5432/<database>
```

## Expo Web Environment

Set these values when exporting the staging web bundle:

```env
EXPO_PUBLIC_API_URL=https://api-staging.example.com
EXPO_PUBLIC_SOCKET_URL=https://api-staging.example.com
```

The API URL and Socket.IO URL must point at the same staging backend unless the
backend is deliberately split across services.

## Migration And Build

Run database migrations after the backend environment is configured:

```powershell
$env:APP_ENV="staging"
$env:DATABASE_URL="sqlite:////persistent/mekina/database.db"
flask db upgrade
```

Build the Expo web app with staging API values:

```powershell
cd mobile
$env:EXPO_PUBLIC_API_URL="https://api-staging.example.com"
$env:EXPO_PUBLIC_SOCKET_URL="https://api-staging.example.com"
npx expo export --platform web
```

Deploy `mobile/dist` to the staging web host.

## Staging Smoke Checks

- Open the Expo web staging URL in a fresh browser session.
- Register and log in as a buyer.
- Submit a general request, a specific car request, an image request, and a
  trade-in request.
- Confirm buyer requests appear without logging out and back in.
- Log in as a dealer and place offers, answer buyer questions, and unlock chat.
- Log in as a rental company and submit/edit rental listings and request points.
- Log in as admin and approve/deny dealer and rental point requests.
- Confirm notifications and message counters update without a full page reload.
- Confirm uploaded images display after a page reload.
- Confirm CORS preflight succeeds from the staging web origin.
- Confirm Socket.IO connects over HTTPS.
