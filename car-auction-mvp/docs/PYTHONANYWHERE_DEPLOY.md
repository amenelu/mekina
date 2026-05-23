# PythonAnywhere Backend Deploy

This is the no-card staging path for the Flask backend. It pairs with
Cloudflare Pages for the Expo web frontend.

## Repo Setup

Use the GitHub repo as the source on PythonAnywhere. From a PythonAnywhere Bash
console:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd car-auction-mvp
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

If the repo is private, authenticate with GitHub inside PythonAnywhere yourself.
Do not put GitHub tokens in committed files.

## Environment

Create a private `.env` file in the repo folder on PythonAnywhere:

```env
APP_ENV=staging
FLASK_APP=run.py
FLASK_DEBUG=false
SECRET_KEY=<long-random-secret>
DATABASE_URL=sqlite:////home/YOUR_PYTHONANYWHERE_USERNAME/mekina-data/database.db
CORS_ALLOWED_ORIGINS=https://YOUR_CLOUDFLARE_PROJECT.pages.dev
PASSWORD_RESET_BASE_URL=https://YOUR_CLOUDFLARE_PROJECT.pages.dev
PASSWORD_RESET_EXPIRATION_MINUTES=30
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=Lax
JWT_EXPIRATION_DAYS=30
MAX_CONTENT_LENGTH=16777216
```

Password reset emails require SMTP settings. If SMTP is not configured, the
backend logs the reset link, which is acceptable for staging but not for public
production. In non-production, the API also reports that email delivery is not
configured instead of pretending an email was sent.

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_USE_TLS=true
```

Create the persistent data folder:

```bash
mkdir -p /home/YOUR_PYTHONANYWHERE_USERNAME/mekina-data
mkdir -p static/uploads
```

PythonAnywhere free accounts have limited disk space, so keep uploaded test
images small and clean old test uploads when needed.

## Database

Run migrations from the project folder:

```bash
source venv/bin/activate
flask db upgrade
```

SQLite is stored in `/home/YOUR_PYTHONANYWHERE_USERNAME/mekina-data/database.db`.
That keeps the database out of the Git repo and outside deploy-only files.

## Web App Config

In the PythonAnywhere **Web** tab:

- Create a new manual web app.
- Choose a Python version that matches the virtualenv.
- Set the source code path to the cloned repo folder.
- Set the virtualenv path to the repo `venv`.
- In the WSGI file, either paste the contents of `pythonanywhere_wsgi.py` or
  import it from the repo.

The WSGI callable name is:

```python
application
```

Your backend URL will look like:

```text
https://YOUR_PYTHONANYWHERE_USERNAME.pythonanywhere.com
```

## Cloudflare Pages Frontend

In Cloudflare Pages Git integration, use:

```text
Root directory: mobile
Build command: npm ci && npx expo export -p web
Build output directory: dist
```

Set these Cloudflare Pages environment variables:

```env
EXPO_PUBLIC_API_URL=https://YOUR_PYTHONANYWHERE_USERNAME.pythonanywhere.com
EXPO_PUBLIC_SOCKET_URL=https://YOUR_PYTHONANYWHERE_USERNAME.pythonanywhere.com
```

After Cloudflare gives you a `pages.dev` URL, put that exact URL in the
PythonAnywhere `.env` as `CORS_ALLOWED_ORIGINS`, then reload the PythonAnywhere
web app.

## Socket.IO Note

The backend has Socket.IO features for messages and notifications. Standard
PythonAnywhere WSGI is enough to test the REST API, auth, listings, requests,
admin flows, and most screens. Real-time Socket.IO behavior needs the
PythonAnywhere Flask-SocketIO beta path and must be tested on the deployed app.

If Socket.IO is unreliable on PythonAnywhere free, the fallback for staging is
to rely on refresh/polling behavior until a backend host with first-class
WebSocket support is available.

## Smoke Checks

- Open the Cloudflare Pages URL in a fresh browser.
- Register and log in as a buyer.
- Submit each request type and confirm it appears in My Requests.
- Log in as dealer and place offers.
- Log in as rental company and submit/edit rentals.
- Log in as admin and approve point requests.
- Reload the browser and confirm auth/data still load.
- Upload an image, reload, and confirm the image still displays.
