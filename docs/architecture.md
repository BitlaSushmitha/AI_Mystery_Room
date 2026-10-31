# Architecture

The Vite React client calls the Express API at `/api/v1`. The browser receives a random, high-entropy session token once when a case is created and stores it locally by case ID. The server stores only an HMAC-SHA256 hash of that token. Every session endpoint checks the case ID and token together.

Case generation validates the user request, asks Gemini for JSON, validates the case shape and cross references, verifies suspect and evidence counts, then saves the case and session. Invalid generated cases are rejected before persistence. MongoDB is the source of truth after creation. `solution` is excluded from normal case queries and the public serializer omits it; results queries explicitly select it only after a session has an accusation.

Accusation is evaluated by the server and stored with a conditional update requiring an in-progress session without an accusation. This makes duplicate final submissions return a conflict. Evidence review uses MongoDB `$addToSet`, so marking an item reviewed is idempotent. Notes are bounded and scoped to the active session.

## Reliability and media

Gemini is the only required AI service. Image and video generation are intentionally optional: images use labeled illustrative placeholders and CCTV evidence uses a simulated text transcript, without fake playback controls. AI output is treated as untrusted data and validated before persistence. API errors use a consistent JSON envelope and production errors do not return stack traces.

## API response envelope

Success: `{ "success": true, "data": {}, "message": "..." }`

Error: `{ "success": false, "error": { "code": "...", "message": "...", "details": [] } }`
