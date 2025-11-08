import logging
import os
from importlib import reload


def test_analyze_logs_blocks(monkeypatch, capsys):
    # Force verbose mode BEFORE any module imports
    monkeypatch.setenv("ABU_VERBOSE", "1")

    # Clear any previously imported abu_engine modules to ensure fresh reload
    import sys
    to_remove = [k for k in sys.modules if k.startswith("abu_engine")]
    for k in to_remove:
        del sys.modules[k]

    # Now import fresh with ABU_VERBOSE=1 in environment
    from fastapi.testclient import TestClient
    import abu_engine.main as main_mod
    app = main_mod.app

    client = TestClient(app)
    payload = {
        "person": {"name": "", "question": ""},
        "birth": {"date": "1990-01-01T12:00:00Z", "lat": -34.6, "lon": -58.4},
        "current": {"lat": -34.6, "lon": -58.4}
    }
    resp = client.post("/analyze", json=payload)
    assert resp.status_code == 200

    # Capture stdout/stderr where JSON lines are emitted
    captured = capsys.readouterr()
    output = captured.out + captured.err
    # With ABU_VERBOSE=1, should see JSON format with "event" key
    assert ('"event": "analyze.blocks"' in output or 'event":"analyze.blocks"' in output), \
        f"Expected JSON event=analyze.blocks in verbose logs. Got:\n{output}"
