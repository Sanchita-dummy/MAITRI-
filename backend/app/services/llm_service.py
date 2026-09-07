"""
Thin wrapper around the Groq API. This is the ONLY module that should ever
call an LLM provider directly (rule 15: Groq is only the LLM provider).
Never hardcode API keys - always read from settings/env.
"""
import json
import logging
from typing import Optional
from groq import Groq
from app.config import settings

logger = logging.getLogger("maitri.llm")

_client: Optional[Groq] = None


def get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.groq_api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Add it to backend/.env (see .env.example)."
            )
        # timeout=20s so a bad key / network issue fails fast instead of hanging the request
        _client = Groq(api_key=settings.groq_api_key, timeout=20.0, max_retries=1)
    return _client


def chat(system_prompt: str, user_prompt: str, temperature: float = 0.4,
         max_tokens: int = 1024, json_mode: bool = False) -> str:
    """
    Single-turn chat completion. Returns raw text content.
    If json_mode is True, asks Groq to return valid JSON and the caller
    is responsible for json.loads-ing the result.
    """
    client = get_client()
    kwargs = dict(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    completion = client.chat.completions.create(**kwargs)
    return completion.choices[0].message.content


def chat_json(system_prompt: str, user_prompt: str, temperature: float = 0.3,
              max_tokens: int = 1024) -> dict:
    """
    Convenience wrapper that requests JSON output and parses it, with a
    fallback if the model wraps JSON in markdown fences.
    """
    raw = chat(system_prompt, user_prompt, temperature=temperature,
               max_tokens=max_tokens, json_mode=True)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        cleaned = raw.strip().strip("`")
        cleaned = cleaned.replace("json\n", "", 1) if cleaned.startswith("json\n") else cleaned
        return json.loads(cleaned)
