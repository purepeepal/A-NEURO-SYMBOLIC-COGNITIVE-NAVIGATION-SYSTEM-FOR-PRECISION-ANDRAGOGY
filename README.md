# A-NEURO-SYMBOLIC-COGNITIVE-NAVIGATION-SYSTEM-FOR-PRECISION-ANDRAGOGY (STREETS v3)

Adaptive assessment engine powered by Next.js, Supabase, and LLMs (Gemini / Groq / Institute).

---

## Prerequisites

| Tool | Version |
|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | ≥ 4.x |
| [Git](https://git-scm.com/) | ≥ 2.x |

You'll also need API keys for:
- **Supabase** — project URL, anon key, service role key
- **Google Gemini** — API key (primary provider)
- **Groq** — API key (fast fallback)
- **Institute** — API key + base URL (optional, OpenAI-compatible endpoint)

---

## Quick Start (Clone & Run)

```bash
# 1. Clone the repository
git clone https://github.com/purepeepal/streets-v2.git
cd streets-v2/streets-v3

# 2. Create your environment file
cp .env.example .env.local

# 3. Fill in your API keys in .env.local
#    Open .env.local in any editor and replace the placeholder values.

# 4. Build and start the container
docker compose up --build -d

# 5. Verify it's running
docker ps
# STATUS should show "healthy" after ~30 seconds

# 6. Open the app
# Visit http://localhost:6001 in your browser
```

---

## Environment Variables

Copy `.env.example` → `.env.local` and fill in all values:

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ |
| `GROQ_API_KEY` | Groq API key (fast fallback LLM) | ✅ |
| `INSTITUTE_API_KEY` | Institute LLM API key (OpenAI-compatible) | ❌ |
| `INSTITUTE_BASE_URL` | Institute endpoint base URL | ❌ |
| `INSTITUTE_MODEL` | Institute model name (default: `llama-3.1-70b`) | ❌ |

> **Note:** `NEXT_PUBLIC_*` variables are embedded into the client bundle at build time. If you change them, you must rebuild: `docker compose up --build -d`.

---

## Development Workflow

### Rebuild after code changes
```bash
docker compose up --build -d
```

### View container logs
```bash
docker compose logs -f web
```

### Stop the container
```bash
docker compose down
```

### Full reset (clear Docker cache)
```bash
docker compose down
docker builder prune -f
docker compose up --build -d
```

---

## Health Check

The app exposes `GET /api/health` for monitoring:

```bash
curl http://localhost:6001/api/health
# → {"status":"ok","timestamp":"2026-03-02T06:30:00.000Z","version":"0.1.0"}
```

Docker automatically polls this endpoint and reports health status in `docker ps`.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `docker compose up` fails with build errors | Run `docker builder prune -f` then rebuild with `--no-cache` |
| Container starts but shows "unhealthy" | Check logs: `docker compose logs web`. Usually a missing or invalid env var |
| `401 Unauthorized` from LLM APIs | Verify your `GEMINI_API_KEY` and `GROQ_API_KEY` in `.env.local`, then restart |
| Signup shows `Email rate limit exceeded` (429) | This comes from Supabase Auth, not the Docker container logs. Wait ~60 seconds and retry. If it persists, your project may have hit the built-in email quota (2 emails/hour) and needs custom SMTP or updated limits in Supabase Dashboard -> Authentication -> Rate Limits. |
| `NEXT_PUBLIC_*` vars not taking effect | These are baked in at build time — must `docker compose up --build` |
| Port 6001 already in use | Change the host port in `docker-compose.yml`: `"XXXX:3000"` |
