# Receipt Analyzer

A self-hosted web application for scanning and analyzing store receipts using local AI. Upload a photo or PDF of any receipt and get structured data extracted automatically — store, date, items, prices, payment method, and totals. All processing runs on your own infrastructure with no external API calls.

## Features

- **AI-powered extraction** — uses a local vision language model (via [Ollama](https://ollama.com)) to read receipts
- **Upload anything** — supports JPG, PNG, WebP, and PDF (first page is analyzed)
- **Full CRUD** — view, edit, and delete receipts and individual line items
- **Statistics** — monthly spending charts, per-store breakdown, spending trends
- **Mobile-first** — responsive UI with bottom navigation, designed for phone use
- **Dark mode** — follows system preference, toggleable in the header
- **Self-contained** — SQLite database, no external services required

## Architecture

```
Browser
  └── Nginx :80
        ├── /          React SPA
        ├── /api/      FastAPI backend
        └── /uploads/  Uploaded receipt files

FastAPI
  ├── SQLite (persistent volume)
  └── Ollama vision API (configurable host)
```

## Requirements

- A machine running [Ollama](https://ollama.com) with a vision model installed
- A server or Raspberry Pi with Docker and Docker Compose
- Both machines reachable on the same network

## Ollama Setup

Install a vision model on your Ollama host:

```bash
ollama pull llama3.2-vision:11b
```

Make sure the Ollama API is reachable from the server that will run this app:

```bash
curl http://<ollama-host>:11434/api/tags
```

## Deployment

```bash
git clone https://github.com/Dragxy/receipt-analyzer
cd receipt-analyzer
```

Edit `docker-compose.yml` to point to your Ollama host:

```yaml
environment:
  - OLLAMA_URL=http://<your-ollama-host>:11434
  - OLLAMA_MODEL=llama3.2-vision:11b
```

Then start:

```bash
docker compose up --build -d
```

The app is available on port 80.

To update after pulling new changes:

```bash
git pull && docker compose up --build -d
```

## Configuration

All settings are passed as environment variables in `docker-compose.yml`:

| Variable | Description |
|----------|-------------|
| `OLLAMA_URL` | Base URL of your Ollama instance |
| `OLLAMA_MODEL` | Vision model to use for extraction |
| `DATABASE_URL` | SQLAlchemy database URL (default: SQLite) |

## Local Development

**Backend:**

```bash
cd backend
pip install -r requirements.txt
DATABASE_URL=sqlite:///./dev.db uvicorn main:app --reload
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` and `/uploads` to `localhost:8000` during development.

## Data Persistence

Uploaded files and the database are stored in a Docker named volume (`receipt_data`), which persists across restarts and updates.

**Backup:**

```bash
docker run --rm \
  -v receipt-analyzer_receipt_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/receipt_backup.tar.gz -C /data .
```
