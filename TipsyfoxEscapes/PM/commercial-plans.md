# Commercial tier product direction (Studio / Venue)

Backlog for operator-focused capabilities beyond the Home host MVP. **Not implemented in this pass** — metadata placeholders live on billing catalog entries in `Dev/app/backend/src/billing/catalog.ts`.

## Tier positioning

| Capability | Home (trial / packs) | Studio | Venue |
| --- | --- | --- | --- |
| Room design & export | Yes | Yes | Yes |
| GM tablet dashboard | — | Planned | Planned |
| Reset checklists per room | — | Planned | Planned |
| Multi-user staff accounts | — | Planned | Planned |
| Prop maintenance logs | — | Planned | Planned |
| Commercial license / white-label exports | — | Planned | Planned |
| Seasonal content vault | — | — | Planned |
| Live-sync during sessions | — | — | Planned |

## Studio pack — backlog

- **GM tablet dashboard**: run-mode view with stage timers, hint queue, and crew assignments.
- **Reset checklists**: per-room teardown/setup steps tied to exported puzzle list.
- **Staff seats**: invite co-GMs with role-based permissions (build vs run).
- **Prop maintenance logs**: serial props, battery swaps, last-tested dates.
- **Commercial license flag** on exports (operator use, not personal home).
- **White-label exports**: venue logo, host script header, stripped builder branding.

## Venue pack — backlog (includes Studio)

- **Multi-room library**: cross-room search, duplicate room templates, seasonal variants.
- **Seasonal vault**: rotate themed asset packs without breaking saved plans.
- **Live-sync**: optional real-time state between GM tablet and in-room stations (future).
- **Org pool bonuses** (existing server concept) documented for multi-site operators.

## Engineering notes

- Billing today is **one-time room packs** (`billingModel: one_time_room_packs`); Studio/Venue are higher slot + export bundles.
- Add feature flags to plan metadata before building UI; gate routes in `server.ts` when each capability ships.
- QA focus for commercial: reset fidelity, staff permission boundaries, export licensing text.
