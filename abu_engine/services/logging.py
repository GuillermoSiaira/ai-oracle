"""Structured logging utilities for Abu Engine.

Activación modo verbose:
  Setear ABU_VERBOSE=1 para emitir líneas JSON con estructura:
    {"ts": ISO8601, "level": "INFO", "event": "...", "meta": {...}}

Por defecto (ABU_VERBOSE distinto de 1) se usa formato compacto de texto.
Evita duplicar handlers si uvicorn ya configuró logging.
"""
from __future__ import annotations

import logging
import os
import json
from datetime import datetime, timezone
from typing import Any, Dict

VERBOSE = os.getenv("ABU_VERBOSE", "0") == "1"

class JsonLineFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:  # type: ignore[override]
        payload: Dict[str, Any] = {
            "ts": datetime.now(tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "event": getattr(record, "event", record.getMessage().split(" ")[0] if record.getMessage() else "log"),
            "meta": {}
        }
        # If extra meta dict provided
        meta = getattr(record, "meta", None)
        if isinstance(meta, dict):
            payload["meta"] = meta
        else:
            # Fallback: include full message under msg
            payload["meta"] = {"msg": record.getMessage()}
        return json.dumps(payload, ensure_ascii=False)


def init_logging(verbose: bool | None = None) -> None:
    """Initialize logging configuration.

    verbose: override env flag for tests.
    """
    if verbose is None:
        verbose = VERBOSE

    root = logging.getLogger()
    # Avoid duplicating handlers if already configured
    if getattr(root, "_abu_logging_initialized", False):  # type: ignore[attr-defined]
        return

    # Remove default handlers added by uvicorn/basicConfig to control formatting
    for h in list(root.handlers):
        root.removeHandler(h)

    handler = logging.StreamHandler()
    if verbose:
        handler.setFormatter(JsonLineFormatter())
        root.setLevel(logging.INFO)
    else:
        formatter = logging.Formatter("[%(levelname)s] %(message)s")
        handler.setFormatter(formatter)
        root.setLevel(logging.INFO)

    root.addHandler(handler)
    # Flag to avoid re-init
    root._abu_logging_initialized = True  # type: ignore[attr-defined]


def log_event(event: str, meta: Dict[str, Any], level: int = logging.INFO) -> None:
    """Helper to emit structured event log respecting verbose mode."""
    if VERBOSE:
        logging.getLogger(__name__).log(level, event, extra={"event": event, "meta": meta})
    else:
        logging.getLogger(__name__).log(level, f"{event} {meta}")
