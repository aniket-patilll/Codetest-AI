"""
FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import execution, submission, evaluation, leaderboard, generation

settings = get_settings()

app = FastAPI(
    title="CodeCraft API",
    description="Backend API for the AI-powered coding test platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(execution.router, prefix="/api/v1", tags=["Code Execution"])
app.include_router(submission.router, prefix="/api/v1", tags=["Submissions"])
app.include_router(evaluation.router, prefix="/api/v1", tags=["AI Evaluation"])
app.include_router(leaderboard.router, prefix="/api/v1", tags=["Leaderboard"])
app.include_router(generation.router, prefix="/api/v1", tags=["Generation"])


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "CodeCraft API",
        "version": "1.0.0",
        "docs": "/docs",
    }
