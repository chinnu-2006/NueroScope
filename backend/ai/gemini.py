"""Gemini client — optional. Missing key ⇒ mock answers, no exceptions.

Uses the current SDK's `google-generativeai` package. We try a small list of
model names in order so we survive Google's periodic model deprecations
without a code change.
"""
from __future__ import annotations

import os
import threading
from typing import Optional


# Ordered fallback list — first one that works wins for the process lifetime.
_MODEL_CANDIDATES = (
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
)

_client_lock = threading.Lock()
_state: dict = {"model": None, "model_name": None, "tried": False}


def _is_configured() -> bool:
    return bool(os.getenv("GEMINI_API_KEY"))


def _resolve_model():
    """Instantiate the first model name in _MODEL_CANDIDATES that Gemini
    accepts. Cached for the process lifetime. Returns (model, name) or
    (None, None)."""
    if not _is_configured():
        return None, None
    with _client_lock:
        if _state["model"] is not None:
            return _state["model"], _state["model_name"]
        if _state["tried"]:
            # Previous resolution failed — don't retry every request.
            return None, None
        try:
            import google.generativeai as genai
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        except Exception as e:
            print(f"[gemini] configure failed: {e}")
            _state["tried"] = True
            return None, None

        for name in _MODEL_CANDIDATES:
            try:
                m = genai.GenerativeModel(name)
                # A tiny probe call so we fail fast on the wrong model name.
                m.generate_content("ping", generation_config={"max_output_tokens": 1})
                _state["model"] = m
                _state["model_name"] = name
                print(f"[gemini] using model: {name}")
                return m, name
            except Exception as e:
                print(f"[gemini] {name} unavailable: {str(e)[:120]}")
                continue
        _state["tried"] = True
        return None, None


def is_available() -> bool:
    """True when a key is configured. Doesn't guarantee the model resolved."""
    return _is_configured()


def active_model_name() -> Optional[str]:
    _, name = _resolve_model()
    return name


def generate(system: str, user: str) -> Optional[str]:
    """Return Gemini's answer, or None if unavailable or on error.

    Callers should fall back to a mock response when this returns None.
    """
    model, _ = _resolve_model()
    if model is None:
        return None
    try:
        prompt = f"{system}\n\n---\n\n{user}"
        resp = model.generate_content(prompt)
        return (resp.text or "").strip()
    except Exception as e:
        print(f"[gemini] generate failed: {e}")
        return None
