# Receipt Analyzer

Web app deployed on Raspberry Pi, accessible via Tailscale network. Analyzes receipts using Ollama vision AI on "arcturus".

## Architecture

```
[Browser] → [RPi: Nginx :80] → [React SPA (static)]
                              → [FastAPI :8000] → [SQLite /data/receipts.db]
                                                 → [Ollama @ arcturus:11434]
```

## Stack

- **Backend:** FastAPI (Python 3.12), SQLAlchemy, SQLite
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts
- **AI:** Ollama `llama3.2-vision:11b` on host `arcturus` (Tailscale)
- **Deployment:** Docker Compose on Raspberry Pi (ARM64)

## Key Paths

- Uploads + DB: Docker named volume `receipt_data` → mounted at `/data`
- Files served at: `/uploads/{filename}` (via FastAPI StaticFiles)
- API prefix: `/api`

## Environment Variables (docker-compose.yml)

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://arcturus:11434` | Ollama base URL |
| `OLLAMA_MODEL` | `llama3.2-vision:11b` | Vision model name |
| `DATABASE_URL` | `sqlite:////data/receipts.db` | SQLAlchemy DB URL |

## Database Models

- **Receipt:** store, date, payment_method, total, currency, file_path (UUID.ext), thumbnail_path (UUID.jpg), created_at
- **Item:** receipt_id (FK), name, price, amount, unit

## Deployment on RPi

```bash
git pull
docker compose up --build -d
```

App then accessible at `http://<rpi-tailscale-ip>` from any Tailscale device.

## Development

```bash
# Backend
cd backend && pip install -r requirements.txt
DATABASE_URL=sqlite:///./dev.db uvicorn main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```
