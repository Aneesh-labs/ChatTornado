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

from auth_routes import router as auth_router, limiter
from user_routes import router as user_router
from websocket_routes import router as websocket_router
from upload_routes import router as upload_router
from connection_routes import router as connection_router
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

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
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from fastapi.responses import JSONResponse
from auth import decode_token

# ============================================================================
# CORS
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# ============================================================================
# Request Logger Middleware
# ============================================================================

@app.middleware("http")
async def log_requests_middleware(request, call_next):
    origin = request.headers.get("origin", "no-origin")
    method = request.method
    path = request.url.path
    query = str(request.url.query)
    print(f"[HTTP INCOMING] {method} {path}?{query} | Origin: {origin} | Client: {request.client}")
    response = await call_next(request)
    print(f"[HTTP OUTGOING] {method} {path} -> Status {response.status_code} | CORS Origin: {response.headers.get('access-control-allow-origin')}")
    return response

# ============================================================================
# Email Verification Middleware
# ============================================================================

@app.middleware("http")
async def email_verification_middleware(request, call_next):
    allowed_paths = [
        "/", "/login", "/signup", "/refresh", "/verify",
        "/verify-email", "/resend-verification", "/docs", "/openapi.json"
    ]
    path = request.url.path
    
    if path in allowed_paths or path.startswith("/uploads/"):
        return await call_next(request)
        
    # Attempt to extract token from query params or Auth header
    token = request.query_params.get("token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if token:
        payload = decode_token(token)
        if payload and payload.get("email_verified") is False:
            # We found a valid token but the user is explicitly unverified.
            # Block them from accessing this protected route.
            return JSONResponse(
                status_code=403, 
                content={"detail": "Email not verified. Please verify your email to perform this action."}
            )
            
    return await call_next(request)

# ============================================================================
# Routers
# ============================================================================

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(message_router)
app.include_router(websocket_router)
app.include_router(upload_router)
app.include_router(connection_router)

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