# Running the Digital Inspection System locally with Docker

This project is fully Docker-ready. You can run the complete stack (MongoDB + FastAPI backend + React frontend) on any machine that has Docker.

## Prerequisites

- Docker 24+ and Docker Compose v2 (included with Docker Desktop)
- Ports `3000` and `8001` free on your machine (configurable)

## 1. Configure environment

```bash
cp .env.docker.example .env
```

Open `.env` and change at least:
- `JWT_SECRET` — set to a long random string (e.g., `openssl rand -hex 32`)
- `ADMIN_PASSWORD` — change from the default `admin123` before first run

## 2. Build and run

```bash
docker compose up -d --build
```

This will:
- Pull and start **MongoDB 7** with a persistent volume (`mongo_data`)
- Build and start the **FastAPI backend** on port `8001`
- Build and start the **React frontend** (served by Nginx) on port `3000`
- Automatically seed an admin account + 4 default technicians + 15 default questions + 3 chillers + 3 panels

## 3. Access the app

- Frontend: http://localhost:3000
- Backend API (optional, for curl/Postman): http://localhost:8001/api

## 4. Default credentials

After first startup, the backend auto-seeds these accounts (defined in `.env`):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@inspection.app` | value of `ADMIN_PASSWORD` |
| Electrical technician | `tech1@inspection.app` / `tech2@inspection.app` | `tech123` |
| Mechanical technician | `tech3@inspection.app` / `tech4@inspection.app` | `tech123` |

**Change every password immediately** via the admin panel ("المستخدمون" tab).

## 5. Common commands

```bash
# Watch logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop everything (data is preserved)
docker compose down

# Stop and wipe the database (fresh start)
docker compose down -v

# Rebuild after code changes
docker compose build backend
docker compose up -d backend

# Rebuild frontend (required if you change REACT_APP_BACKEND_URL)
docker compose build frontend
docker compose up -d frontend
```

## 6. Production deployment notes

When deploying this to a real server:

1. **Change `JWT_SECRET`** to a fresh random 64-char string.
2. **Change all default passwords** after first login.
3. **Update `REACT_APP_BACKEND_URL`** to your public backend URL and rebuild the frontend.
4. **Update `CORS_ORIGINS`** in backend env to your frontend URL.
5. Serve behind a TLS-terminating reverse proxy (Caddy, Traefik, or Nginx with Let's Encrypt).
6. Consider adding MongoDB authentication (`MONGO_INITDB_ROOT_USERNAME`/`MONGO_INITDB_ROOT_PASSWORD`) and updating `MONGO_URL` accordingly.
7. Back up the `mongo_data` volume regularly.

## 7. Project structure

```
.
├── docker-compose.yml          # Orchestration
├── .env.docker.example         # Copy to .env
├── backend/
│   ├── Dockerfile              # Python 3.11 + FastAPI
│   ├── requirements.prod.txt   # Minimal production deps
│   └── server.py               # All API routes
└── frontend/
    ├── Dockerfile              # Node build → Nginx
    ├── nginx.conf              # SPA fallback + gzip
    └── src/                    # React app
```

## 8. Troubleshooting

**Frontend shows "Network Error" on login**
The baked-in `REACT_APP_BACKEND_URL` doesn't match what the browser can reach. Check your `.env` and rebuild: `docker compose build frontend && docker compose up -d frontend`.

**Backend can't connect to MongoDB**
Wait ~20 seconds on first start (Mongo needs to initialize). Check `docker compose logs mongo`.

**Port already in use**
Change `BACKEND_PORT` and/or `FRONTEND_PORT` in `.env` and re-run `docker compose up -d`.

**Admin password changed but still can't log in**
By design, the backend re-syncs the admin password from `.env` on every startup. If you changed it via the UI, either update `.env` to match, or remove the sync logic in `server.py`'s `startup()` function.
