from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from sqlalchemy import text
from database import engine
import models
from routers import receipts, stats
from services.file_processor import ensure_upload_dir


def _migrate(eng):
    with eng.connect() as conn:
        try:
            conn.execute(
                text(
                    "ALTER TABLE receipts ADD COLUMN needs_review BOOLEAN NOT NULL DEFAULT 0"
                )
            )
            conn.commit()
        except Exception:
            pass  # column already exists


@asynccontextmanager
async def lifespan(app: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    _migrate(engine)
    ensure_upload_dir()
    yield


app = FastAPI(title="Receipt Analyzer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(receipts.router)
app.include_router(stats.router)


@app.get("/api/health")
async def health():
    from services.ollama import health_check
    ollama_ok = await health_check()
    return {"status": "ok", "ollama": ollama_ok}


app.mount("/uploads", StaticFiles(directory="/data/uploads"), name="uploads")
