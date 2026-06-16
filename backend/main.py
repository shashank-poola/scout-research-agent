from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.database import init_db
from core.logging_config import setup_logging
from api.routes import sessions, workflow, report, chat

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Scout AI",
    version="1.0.0",
    description="AI-powered company research copilot",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/api")
app.include_router(workflow.router, prefix="/api")
app.include_router(report.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
