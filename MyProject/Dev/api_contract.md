# Escape Room Builder - API Contract (MVP Draft)

Base URL: `/api`

## 1) Create Planning Session
`POST /planning/session`

Request:
```json
{
  "playersConcurrent": 4,
  "participantsTotal": 6,
  "environmentType": "living room",
  "availableItems": ["table", "lamp", "bookshelf"]
}
```

Response 201:
```json
{
  "sessionId": "sess_123",
  "createdAt": "2026-05-07T14:00:00.000Z"
}
```

## 2) Generate Themes
`POST /themes/generate`

Request:
```json
{
  "sessionId": "sess_123"
}
```

Response 200:
```json
{
  "themes": [
    { "id": "th_1", "name": "Haunted Library", "description": "..." },
    { "id": "th_2", "name": "Space Distress Beacon", "description": "..." },
    { "id": "th_3", "name": "Clockmaker's Vault", "description": "..." }
  ]
}
```

## 3) Refresh Themes
`POST /themes/refresh`

Request:
```json
{
  "sessionId": "sess_123",
  "excludeThemeIds": ["th_1", "th_2", "th_3"]
}
```

Response 200:
```json
{
  "themes": [
    { "id": "th_4", "name": "Submerged Lab", "description": "..." },
    { "id": "th_5", "name": "Railway Heist", "description": "..." },
    { "id": "th_6", "name": "Arcade Blackout", "description": "..." }
  ]
}
```

## 4) Generate Puzzle Set
`POST /puzzles/generate`

Request:
```json
{
  "sessionId": "sess_123",
  "themeId": "th_4"
}
```

Response 200:
```json
{
  "puzzles": [
    {
      "id": "pz_1",
      "category": "logic",
      "title": "Cipher Index",
      "objective": "...",
      "solveSteps": ["...", "..."],
      "difficulty": "medium"
    },
    {
      "id": "pz_2",
      "category": "physical",
      "title": "Weighted Switch",
      "objective": "...",
      "solveSteps": ["...", "..."],
      "difficulty": "medium"
    },
    {
      "id": "pz_3",
      "category": "electronic",
      "title": "Signal Relay",
      "objective": "...",
      "solveSteps": ["...", "..."],
      "difficulty": "medium"
    }
  ]
}
```

## 5) Replace One Puzzle
`POST /puzzles/:puzzleId/replace`

Request:
```json
{
  "sessionId": "sess_123",
  "themeId": "th_4"
}
```

Response 200:
```json
{
  "replacedPuzzleId": "pz_2",
  "newPuzzle": {
    "id": "pz_7",
    "category": "physical",
    "title": "Magnetic Lock Sequence",
    "objective": "...",
    "solveSteps": ["...", "..."],
    "difficulty": "medium"
  }
}
```

## 6) Export Plan
`POST /plans/:sessionId/export`

Request:
```json
{
  "format": "markdown"
}
```

Response 200:
```json
{
  "planId": "plan_9",
  "format": "markdown",
  "content": "# Escape Room Plan\n..."
}
```

## Error Format
All non-2xx responses return:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "playersConcurrent is required",
    "details": []
  }
}
```

