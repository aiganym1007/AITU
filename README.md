# AITU

## Local development

Install dependencies once in the project root and in `server`:

```powershell
npm install
cd server
npm install
```

Create `server/.env` from `server/env.example` and set `GEMINI_API_KEY` and
`JWT_SECRET`.

From the project root, start the frontend and API together:

```powershell
npm run dev
```

Vite serves the frontend at `http://localhost:5173` and proxies `/api` requests
to the API on port `3001`. Press `Ctrl+C` to stop both processes.

To run either process by itself, use `npm run dev:web` or `npm run dev:api`
from the project root.
