# MAITRI – Government Innovation & Startup Enablement Platform

## Overview
MAITRI is a full‑stack prototype that demonstrates an end‑to‑end workflow for government departments to identify challenges, discover matching startups, evaluate eligibility, and pilot solutions. The platform integrates semantic search (ChromaDB), graph relationships (Neo4j), deterministic rule‑based eligibility, and LLM‑augmented RAG for policy assistance.

## Features
- **Challenge Generation** – Convert government problems into AI‑generated innovation challenges.
- **Semantic Startup Matching** – Vector similarity (ChromaDB) blended with deterministic capability scoring.
- **Eligibility Engine** – Rule‑based checks (TRL, certifications, experience, capacity).
- **Pilot & KPI Tracking** – Record pilot outcomes and automatically compute scale recommendations.
- **Policy Assistant (RAG)** – Ask policy‑related questions; answers are grounded in a knowledge base.
- **Graph Explorer** – Visual relationship graph powered by Neo4j.
- **Dockerised Neo4j** – Easy local deployment with containerised graph database.

## Architecture
```
MAITRI/
├─ frontend/          # React + Vite + Tailwind UI
├─ backend/           # FastAPI + SQLAlchemy (SQLite) + Pydantic
│   ├─ app/          # Routers, services, models
│   └─ seed/         # Scripts to seed SQLite, ChromaDB, Neo4j
├─ data/chroma/       # Persistent vector store
├─ mock-data/         # Synthetic JSON fixtures
└─ docker-compose.yml # Neo4j container
```
- **FastAPI** handles all business logic and exposes a REST API.
- **SQLite** stores transactional data (departments, challenges, startups, etc.).
- **ChromaDB** provides offline vector embeddings for semantic matching.
- **Neo4j** stores a relationship graph that is synchronised from SQLite.
- **Groq** LLM is used only for RAG summarisation and challenge phrasing – embeddings are computed locally, no external model download required.

## Setup
### Prerequisites
- Python 3.11+ (Windows, macOS, Linux)
- Node.js 18+ and npm
- Docker (for Neo4j)
- Groq API key (free tier is sufficient)

### Install dependencies
```bash
# Backend
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

# Frontend (in a new terminal, from the project root)
cd ../frontend
npm install
```

### Configure environment variables
```bash
cd backend
cp .env.example .env   # copy template
# Edit backend/.env and insert your Groq API key
# The GITHUB_TOKEN you provided is already in envexample for CI use
```

### Start services
```bash
# 1. Neo4j (Docker)
cd ../../
docker compose up -d   # starts Neo4j on bolt://localhost:7687

# 2. Initialise databases
cd backend
python -m app.seed.seed_db          # SQLite tables + synthetic data
python -m app.seed.seed_chroma      # Vectorise startups & knowledge docs
python -m app.seed.seed_neo4j       # Sync graph from SQLite

# 3. Run FastAPI backend
uvicorn app.main:app --reload --port 8000

# 4. Run the React frontend (new terminal)
cd ../../frontend
npm run dev   # http://localhost:5173
```

## Usage
- Open the UI at **http://localhost:5173**.
- Browse *Challenges*, click **Find matching startups**, then **Check eligibility**.
- Use the *Policy Assistant* tab to ask questions such as:
  > "What TRL level is typically required before a pilot can begin?"
- Explore the *Relationship Graph* to visualise department → problem → challenge → startup connections.

### API Docs
FastAPI documentation is available at **http://localhost:8000/docs**.

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome‑thing`).
3. Ensure code passes `flake8`/`black` formatting.
4. Open a pull request with a clear description and screenshots.

