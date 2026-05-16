# Work/Home Setup Guide

Use this checklist to move between work and home safely.

## 1) One-time: create remote repo

1. Create a private GitHub repository.
2. In this project root, initialize/push:
   - `git init`
   - `git add .`
   - `git commit -m "Initial project setup"`
   - `git branch -M main`
   - `git remote add origin <your-repo-url>`
   - `git push -u origin main`

## 2) Daily sync workflow

### At work (before leaving)

1. `git status`
2. `git add .`
3. `git commit -m "WIP: <short note>"`
4. `git push`

### At home (before starting)

1. `git pull`
2. Install dependencies (first time or after package changes):
   - `Dev/app/backend`: `npm install`
   - `Dev/app/frontend`: `npm install`
3. Start apps:
   - `Dev/app/backend`: `npm run dev`
   - `Dev/app/frontend`: `npm run dev`

## 3) Environment secrets (required on each machine)

This repo ignores `.env` files. You must create this locally on each computer:

- `Dev/app/backend/.env`

Minimum Google OAuth example:

```env
AUTH_CALLBACK_BASE_URL=http://127.0.0.1:3001
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

If using Facebook/GitHub, also add:

- `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

## 4) Important notes

- If backend restarts, log in again (tokens are currently in-memory).
- If Google login fails with `redirect_uri_mismatch`, verify this exact redirect URI in Google Console:
  - `http://127.0.0.1:3001/api/auth/oauth/google/callback`
- Rotate any OAuth secret that was shared in logs/chat.
