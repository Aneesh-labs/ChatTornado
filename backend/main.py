import os
from dotenv import load_dotenv
load_dotenv()
from pathlib import Path
from message_routes import router as message_router

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine, run_migrations

# Import models so SQLAlchemy can discover them
import models

from auth_routes import router as auth_router
from user_routes import router as user_router
from websocket_routes import router as websocket_router
from upload_routes import router as upload_router

# ============================================================================
# Create Database Tables
# ============================================================================

Base.metadata.create_all(bind=engine)
run_migrations()

# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="ChatTornado Backend",
    version="2.0.0"
)

# ============================================================================
# CORS
# ============================================================================

allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ============================================================================
# Routers
# ============================================================================

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(message_router)
app.include_router(websocket_router)
app.include_router(upload_router)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", Path(__file__).parent / "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ============================================================================
# Root
# ============================================================================

@app.get("/")
def root():
    return {
        "message": "Chat Tornado JWT Backend Online 🌪️"
    }