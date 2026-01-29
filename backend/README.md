# FastAPI Backend for CodeCraft

A Python backend for the AI-powered coding test platform.

## Quick Start

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Copy environment file and configure:
```bash
cp .env.example .env
# Edit .env with your Supabase and Groq API credentials
```

3. Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Docker

Build and run with Docker:
```bash
docker-compose -f docker/docker-compose.yml up --build
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (for admin operations) |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase settings |
| `GROQ_API_KEY` | Groq API key (free tier at [console.groq.com](https://console.groq.com/keys)) |
| `GROQ_MODEL` | Optional; model name (default: `llama-3.1-8b-instant`). e.g. `llama-3.3-70b-versatile` |
