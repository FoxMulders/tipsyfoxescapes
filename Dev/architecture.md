# Escape Room Builder - Architecture (MVP)

## Overview
The MVP uses a client-server architecture:
- React frontend for planning workflow UI.
- Express backend for orchestration, validation, and persistence.
- AI generation services wrapped behind internal interfaces.

## Components
- UI Layer:
  - Planning form
  - Theme selection and refresh
  - Puzzle set display with replace actions
  - Export/save action
- API Layer:
  - Session initialization
  - Theme and puzzle generation routes
  - Replacement route
  - Export route
- Domain Services:
  - Theme generator
  - Puzzle set generator
  - Puzzle balancer
  - Duplication guard
  - Export formatter
- Data Layer:
  - Session state
  - Saved plans
  - Historical puzzle concept metadata (phase-in for P1)

## Request Flow
1. User submits planning input -> backend validates and creates session.
2. User requests themes -> generator returns options.
3. User selects theme -> puzzle generator returns mixed set.
4. User rejects puzzle -> replacement service swaps one puzzle with duplicate guard checks.
5. User exports plan -> exporter builds markdown/text output and stores snapshot.

## Reliability and Safety
- All generation output is schema validated before returning to UI.
- Duplicate prevention enforced server-side to avoid client bypass.
- Session state is authoritative on backend.

## Performance Targets
- Theme generation response target: < 5 seconds.
- Puzzle generation response target: < 5 seconds.
- Replacement response target: < 3 seconds.

## Extensibility
- AI provider abstraction allows swapping model/provider without changing routes.
- Puzzle categories are enum-driven and can be expanded in P2.
- Export strategy can add PDF/print format later without changing core workflow.

