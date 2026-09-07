"""
SQLAlchemy engine/session setup.
Uses SQLite for the prototype. Models avoid SQLite-only types so migrating
to PostgreSQL later mainly means changing DATABASE_URL and running migrations.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import BACKEND_DIR, settings


def _database_url(url: str) -> str:
    """Resolve relative SQLite paths from the backend directory."""
    if not url.startswith("sqlite:///") or url == "sqlite:///:memory:":
        return url

    database_path = url.removeprefix("sqlite:///")
    if not database_path.startswith(("/", "\\")) and not (
        len(database_path) > 1 and database_path[1] == ":"
    ):
        database_path = str(BACKEND_DIR / database_path)
    return f"sqlite:///{database_path.replace(chr(92), '/')}"


DATABASE_URL = _database_url(settings.database_url)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
