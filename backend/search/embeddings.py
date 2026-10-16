"""Sentence-transformers loader. Lazy singleton so we don't eat the
~90MB model download at import time.
"""
from __future__ import annotations

import threading
from typing import Iterable

import numpy as np

_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_model = None
_lock = threading.Lock()


def get_model():
    """Load once, share across threads. First call downloads the weights."""
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer
                _model = SentenceTransformer(_MODEL_NAME)
    return _model


def embed(texts: Iterable[str]) -> np.ndarray:
    """Return an L2-normalized (N, dim) float32 array — cosine sim = inner product."""
    lst = list(texts)
    if not lst:
        return np.zeros((0, 384), dtype=np.float32)
    model = get_model()
    vecs = model.encode(
        lst,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    ).astype(np.float32)
    return vecs
