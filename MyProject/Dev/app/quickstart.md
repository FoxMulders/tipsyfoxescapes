# Quickstart

Run the app with dev servers (do not open `index.html` directly from file explorer).

## 1) Start backend
From `Dev/app/backend`:

```bash
npm install
# Optional: configure social login providers before starting backend
# copy .env.example .env
npm run dev
```

If using social sign-in, fill values in `Dev/app/backend/.env`.

Backend runs at `http://localhost:3001`.

## 2) Start frontend
From `Dev/app/frontend`:

```bash
npm install
npm run dev
```

Open the URL Vite prints in terminal (typically `http://localhost:5173`).

## 3) Smoke test
- Fill planning inputs.
- Click any planning action button to auto-start a session.
- Click `Generate Themes`.
- Confirm themes render and a selected theme appears.
- Optional social auth check: click `Continue with Google/Facebook/GitHub`, complete provider login, and confirm you return authenticated.

