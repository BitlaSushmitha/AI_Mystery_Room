# AI Mystery Room

An interactive fictional investigation game built with React, Vite, Express, MongoDB, and Google Gemini. The backend generates each mystery, validates it, stores its private solution, and evaluates the final accusation. Case access uses an anonymous, random session token; only its HMAC hash is stored.

## Prerequisites

- Node.js 20 or newer and npm
- MongoDB (local or hosted)
- Google Gemini API key

## Setup

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`, `GEMINI_API_KEY`, and a random `SESSION_SECRET` of at least 32 characters.
2. Run `npm install` at the repository root.
3. Run `npm run dev` to start the API at `http://localhost:5000` and the Vite client at `http://localhost:5173`.
4. Open the Vite URL and create an investigation. The API health endpoint is `/api/v1/health`.

For production, the Express server serves both the built React app and API from one origin. See the [step-by-step deployment walkthrough](DEPLOYMENT.md); the included [Render Blueprint](render.yaml) configures the service. Deploy MongoDB separately and keep Gemini credentials and session secrets in the hosting provider's environment settings. Optional image/video generation is not configured; images are clearly marked placeholders and CCTV is rendered as simulated transcript text.

See [docs/architecture.md](docs/architecture.md) for the data flow and API contract. The implementation plan and full product requirements are in [spec.md](spec.md).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | No | Runtime environment |
| `PORT` | No | API port (default 5000) |
| `CLIENT_URL` | No | Allowed browser origin |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `GEMINI_API_KEY` | For generation | Server-side Gemini credential |
| `GEMINI_MODEL` | No | Gemini model (default `gemini-2.5-flash`) |
| `SESSION_SECRET` | Yes | HMAC key; use at least 32 random characters |
| `VITE_API_BASE_URL` | Production only | API origin baked into the frontend build |

## API summary

All endpoints use `/api/v1`; case operations require the `X-Session-Token` returned at creation.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Health status |
| `POST` | `/cases` | Generate and save a mystery; starts an anonymous session |
| `GET` | `/cases/:caseId` | Public case plus authorized session progress (no solution) |
| `GET` | `/cases/:caseId/evidence` | Filtered and paginated evidence |
| `GET` | `/cases/:caseId/evidence/:evidenceId` | One evidence item |
| `PUT` | `/cases/:caseId/evidence/:evidenceId/reviewed` | Persist reviewed status |
| `PUT` | `/cases/:caseId/notes` | Persist investigation notes |
| `POST` | `/cases/:caseId/accusation` | Submit one final accusation |
| `GET` | `/cases/:caseId/results` | Reveal the saved solution after accusation |

## Tests

Run `npm test`. Tests use local fixtures and do not make Gemini requests.
