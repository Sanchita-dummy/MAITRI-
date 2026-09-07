"""Backward-compatible entry point for the database seed command."""

from app.seed.seed_database import seed


if __name__ == "__main__":
    seed()
