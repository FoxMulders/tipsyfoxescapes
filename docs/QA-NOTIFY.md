# QA notifications on every change

This repo can **push a JSON handoff** (recent diff, file list, commit metadata) to your QA endpoint whenever:

1. **Code is pushed** to GitHub — workflow `.github/workflows/qa-notify.yml` runs backend `tsc`, frontend `build`, then POSTs the payload.
2. **A Cursor file edit completes** — project hook `afterFileEdit` in `.cursor/hooks.json` runs `scripts/qa-notify.mjs` with `QA_SOURCE=after-file-edit` (matcher: `Write|TabWrite`).
3. **A Cursor agent finishes a turn** — project hook `stop` in `.cursor/hooks.json` runs `scripts/qa-notify.mjs` (includes unstaged + staged diff vs `HEAD`).
4. **`git push`** (optional) — enable repo hooks: `git config core.hooksPath .githooks` then `chmod +x .githooks/pre-push` on macOS/Linux.

## Configure the webhook

Set repository **Secrets** (GitHub -> Settings -> Secrets and variables -> Actions):

| Secret             | Purpose                                    |
| ------------------ | ------------------------------------------ |
| `QA_WEBHOOK_URL`   | HTTPS endpoint that accepts `POST` + JSON |
| `QA_WEBHOOK_SECRET`| Optional; sent as `Authorization: Bearer ...` |

For **local / Cursor**, set the same variables in your environment (or a `.env` loaded by your shell) so `node scripts/qa-notify.mjs` can POST.

## Payload shape

`POST` body is JSON with `schema: "qa-handoff/1"`, fields such as `source`, `ref`, `sha`, `lastCommit`, `nameStatus`, `diff` (truncated if very large), and in CI `compareUrl`, `repository`, `actor`. Implement your QA receiver to store, ticket, or forward as needed.

## Throughput warning for afterFileEdit

`afterFileEdit` can fire frequently during active coding sessions. Your QA receiver should:

- deduplicate by `sha + source + timestamp bucket` (or equivalent),
- rate-limit / batch notifications,
- and treat these as **draft review events**, with CI-on-push as the gate for full validation.

## Manual send

From the repository root:

```bash
QA_WEBHOOK_URL=https://example.com/qa-handoff QA_SOURCE=manual node scripts/qa-notify.mjs
```
