# Receipt Analyzer

Web app for scanning and analyzing store receipts using local AI. Runs on a Raspberry Pi, accessible from any device in your Tailscale network.

## Features

- Upload receipts as image (JPG, PNG, WebP) or PDF
- AI-powered extraction via Ollama (`llama3.2-vision:11b`) running on a separate machine
- Extracts: store name, date, payment method, total, and all individual items with prices
- SQLite database, no external dependencies
- Receipt list with search and date range filter
- Monthly spending charts, store statistics, spending trends
- Re-analyze any receipt if the initial result was poor

## Architecture

```
Browser
  └── Nginx :80 (Raspberry Pi)
        ├── /          React SPA (static files)
        ├── /api/      FastAPI backend
        └── /uploads/  Uploaded receipt images

FastAPI
  ├── SQLite  (/data/receipts.db)
  └── Ollama  (http://arcturus:11434 via Tailscale)
```

## Deployment on Raspberry Pi

Requirements: Docker, Docker Compose, Git

```bash
git clone https://github.com/Dragxy/receipt-analyzer
cd receipt-analyzer
docker compose up --build -d
```

The app is then available at `http://<rpi-tailscale-ip>` from any Tailscale device.

To update after a `git push`:

```bash
git pull
docker compose up --build -d
```

## Configuration

Edit `docker-compose.yml` to change:

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://arcturus:11434` | Ollama host |
| `OLLAMA_MODEL` | `llama3.2-vision:11b` | Vision model |

## Ollama Setup (on arcturus)

Install the vision model once:

```bash
ollama pull llama3.2-vision:11b
```

Make sure the Ollama API is reachable from the Raspberry Pi via Tailscale:

```bash
curl http://arcturus:11434/api/tags
```

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

Vite proxies `/api` and `/uploads` to `localhost:8000`.

## Data

All data is stored in a Docker named volume (`receipt_data`). Uploaded files and the SQLite database persist across container restarts and updates.

To back up:

```bash
docker run --rm -v receipt-analyzer_receipt_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/receipt_data_backup.tar.gz -C /data .
```
