from __future__ import annotations

import base64
import html
import json
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Callable
from urllib.parse import urlparse

from aqt import gui_hooks, mw
from aqt.qt import QAction, QTimer
from aqt.utils import tooltip

HOST = "127.0.0.1"
PORT = 8765
ADDON_NAME = "IMAIOS Live Drill Bridge"

_state_lock = threading.RLock()
_server: ThreadingHTTPServer | None = None
_server_thread: threading.Thread | None = None
_server_error = ""
_sequence = 0
_snapshot: dict[str, Any] = {
    "ok": True,
    "connected": True,
    "reviewerActive": False,
    "side": "",
    "sequence": 0,
    "cardId": 0,
    "noteId": 0,
    "deckName": "",
    "modelName": "",
    "questionText": "",
    "answerText": "",
    "questionHtml": "",
    "answerHtml": "",
    "modelCss": "",
    "drillUrl": "",
    "drillPayloadEncoded": "",
    "drillPayload": None,
    "fields": {},
    "error": "",
}


def _bump_sequence() -> int:
    global _sequence
    with _state_lock:
        _sequence += 1
        return _sequence


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.end_headers()
    handler.wfile.write(body)


def _read_json_body(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    length = int(handler.headers.get("Content-Length") or "0")
    if length <= 0:
        return {}
    raw = handler.rfile.read(length).decode("utf-8", errors="replace")
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _strip_html(value: str, limit: int = 3000) -> str:
    text = html.unescape(str(value or ""))
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</(div|p|li|tr|h[1-6])>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n\s+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()
    return text[:limit]


def _base64_url_decode(value: str) -> str:
    normalized = str(value or "").replace("-", "+").replace("_", "/")
    padded = normalized + ("=" * ((4 - len(normalized) % 4) % 4))
    return base64.b64decode(padded.encode("ascii")).decode("utf-8")


def _base64_url_encode(value: str) -> str:
    raw = base64.urlsafe_b64encode(value.encode("utf-8")).decode("ascii")
    return raw.rstrip("=")


def _decode_drill_payload(encoded: str) -> dict[str, Any] | None:
    if not encoded:
        return None
    try:
        payload = json.loads(_base64_url_decode(encoded))
        if isinstance(payload, dict) and payload.get("kind") == "imaios-live-drill":
            return payload
    except Exception:
        return None
    return None


def _find_drill_url_and_payload(texts: list[str]) -> tuple[str, str, dict[str, Any] | None]:
    combined = "\n".join(html.unescape(str(item or "")) for item in texts if item)

    url_match = re.search(
        r"(https?://[^\s\"'<>#]+#imaiosDrill=([A-Za-z0-9_-]+))",
        combined,
        flags=re.I,
    )
    if url_match:
        encoded = url_match.group(2)
        return url_match.group(1), encoded, _decode_drill_payload(encoded)

    hash_match = re.search(r"(?:^|[#?&])imaiosDrill=([A-Za-z0-9_-]+)", combined, flags=re.I)
    if hash_match:
        encoded = hash_match.group(1)
        return "", encoded, _decode_drill_payload(encoded)

    for text in texts:
        raw = str(text or "").strip()
        if not raw:
            continue
        try:
            payload = json.loads(raw)
        except Exception:
            continue
        if isinstance(payload, dict) and payload.get("kind") == "imaios-live-drill":
            return "", _base64_url_encode(json.dumps(payload, separators=(",", ":"))), payload

    return "", "", None


def _reviewer_card() -> Any | None:
    reviewer = getattr(mw, "reviewer", None)
    if not reviewer:
        return None
    return getattr(reviewer, "card", None)


def _note_fields(card: Any) -> dict[str, str]:
    try:
        note = card.note()
    except Exception:
        return {}
    fields: dict[str, str] = {}
    try:
        for name in note.keys():
            try:
                fields[str(name)] = str(note[name])
            except Exception:
                fields[str(name)] = ""
    except Exception:
        pass
    return fields


def _model_name(card: Any) -> str:
    try:
        note = card.note()
        model = note.model()
        return str(model.get("name") or "")
    except Exception:
        return ""


def _model_css(card: Any) -> str:
    try:
        note = card.note()
        model = note.model()
        return str(model.get("css") or "")
    except Exception:
        return ""


def _deck_name(card: Any) -> str:
    try:
        return str(mw.col.decks.name(card.did) or "")
    except Exception:
        return ""


def _card_question(card: Any) -> str:
    try:
        return str(card.question() or "")
    except Exception:
        return ""


def _card_answer(card: Any) -> str:
    try:
        return str(card.answer() or "")
    except Exception:
        return ""


def _refresh_snapshot(side: str | None = None) -> dict[str, Any]:
    global _snapshot
    card = _reviewer_card()
    if not card:
        with _state_lock:
            _snapshot = {
                **_snapshot,
                "ok": True,
                "connected": True,
                "reviewerActive": False,
                "side": "",
                "sequence": _bump_sequence(),
                "cardId": 0,
                "noteId": 0,
                "deckName": "",
                "modelName": "",
                "questionText": "",
                "answerText": "",
                "questionHtml": "",
                "answerHtml": "",
                "modelCss": "",
                "drillUrl": "",
                "drillPayloadEncoded": "",
                "drillPayload": None,
                "fields": {},
                "error": _server_error,
                "serverTime": time.time(),
            }
            return dict(_snapshot)

    fields = _note_fields(card)
    question_html = _card_question(card)
    answer_html = _card_answer(card)
    drill_url, encoded, payload = _find_drill_url_and_payload(
        list(fields.values()) + [question_html, answer_html]
    )
    try:
        card_id = int(card.id)
    except Exception:
        card_id = 0
    try:
        note_id = int(card.nid)
    except Exception:
        note_id = 0

    with _state_lock:
        previous_side = str(_snapshot.get("side") or "")
        new_side = side or previous_side or "question"
        previous_card_id = int(_snapshot.get("cardId") or 0)
        sequence = int(_snapshot.get("sequence") or 0)
        if previous_card_id != card_id or previous_side != new_side:
            sequence = _bump_sequence()
        _snapshot = {
            "ok": True,
            "connected": True,
            "reviewerActive": True,
            "side": new_side,
            "sequence": sequence,
            "cardId": card_id,
            "noteId": note_id,
            "deckName": _deck_name(card),
            "modelName": _model_name(card),
            "questionText": _strip_html(question_html, 1200),
            "answerText": _strip_html(answer_html, 3000),
            "questionHtml": question_html,
            "answerHtml": answer_html,
            "modelCss": _model_css(card),
            "drillUrl": drill_url,
            "drillPayloadEncoded": encoded,
            "drillPayload": payload,
            "fields": {key: _strip_html(value, 900) for key, value in fields.items()},
            "error": _server_error,
            "serverTime": time.time(),
        }
        return dict(_snapshot)


def _run_on_main_sync(fn: Callable[[], Any], timeout: float = 8.0) -> Any:
    done = threading.Event()
    result: dict[str, Any] = {}

    def wrapper() -> None:
        try:
            result["value"] = fn()
        except Exception as error:
            result["error"] = error
        finally:
            done.set()

    try:
        mw.taskman.run_on_main(wrapper)
    except Exception:
        QTimer.singleShot(0, wrapper)

    if not done.wait(timeout):
        raise RuntimeError("Timed out waiting for Anki main thread.")
    if "error" in result:
        raise result["error"]
    return result.get("value")


def _invoke_reviewer_method(names: list[str], *args: Any) -> Any:
    reviewer = getattr(mw, "reviewer", None)
    if not reviewer:
        raise RuntimeError("Anki reviewer is not active.")
    for name in names:
        method = getattr(reviewer, name, None)
        if callable(method):
            return method(*args)
    raise RuntimeError(f"Could not find reviewer method: {', '.join(names)}.")


def _show_answer_on_main() -> dict[str, Any]:
    if not _reviewer_card():
        raise RuntimeError("No active Anki review card.")
    _invoke_reviewer_method(["_showAnswer", "showAnswer", "_show_answer", "show_answer"])
    return _refresh_snapshot("answer")


def _answer_on_main(ease: int) -> dict[str, Any]:
    if ease not in (1, 2, 3, 4):
        raise RuntimeError("Ease must be 1, 2, 3, or 4.")
    if not _reviewer_card():
        raise RuntimeError("No active Anki review card.")
    side = str(_snapshot.get("side") or "")
    if side != "answer":
        _invoke_reviewer_method(["_showAnswer", "showAnswer", "_show_answer", "show_answer"])
    _invoke_reviewer_method(["_answerCard", "answerCard", "_answer_card", "answer_card"], ease)
    return _refresh_snapshot("question")


class BridgeHandler(BaseHTTPRequestHandler):
    server_version = "IMAIOSLiveDrillBridge/1.0"

    def log_message(self, _format: str, *args: Any) -> None:
        return

    def do_OPTIONS(self) -> None:
        _json_response(self, 200, {"ok": True})

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/health":
            _json_response(self, 200, {"ok": True, "name": ADDON_NAME, "serverTime": time.time()})
            return
        if path == "/state":
            try:
                snapshot = _run_on_main_sync(lambda: _refresh_snapshot(None), timeout=6.0)
                _json_response(self, 200, snapshot)
            except Exception as error:
                _json_response(self, 500, {"ok": False, "error": str(error), "connected": True})
            return
        _json_response(self, 404, {"ok": False, "error": "Unknown endpoint."})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        body = _read_json_body(self)
        try:
            if path == "/show-answer":
                state = _run_on_main_sync(_show_answer_on_main, timeout=8.0)
                _json_response(self, 200, {"ok": True, "state": state})
                return
            if path == "/answer":
                ease = int(body.get("ease") or 0)
                state = _run_on_main_sync(lambda: _answer_on_main(ease), timeout=8.0)
                _json_response(self, 200, {"ok": True, "state": state})
                return
            _json_response(self, 404, {"ok": False, "error": "Unknown endpoint."})
        except Exception as error:
            _json_response(self, 500, {"ok": False, "error": str(error)})


def _start_server() -> None:
    global _server, _server_thread, _server_error
    if _server:
        return
    try:
        _server = ThreadingHTTPServer((HOST, PORT), BridgeHandler)
        _server_thread = threading.Thread(target=_server.serve_forever, daemon=True)
        _server_thread.start()
        _server_error = ""
        _refresh_snapshot(None)
        tooltip(f"{ADDON_NAME} running on {HOST}:{PORT}", period=2500)
    except Exception as error:
        _server = None
        _server_error = str(error)
        tooltip(f"{ADDON_NAME} failed to start: {_server_error}", period=6000)


def _on_show_question(card: Any) -> None:
    _refresh_snapshot("question")


def _on_show_answer(card: Any) -> None:
    _refresh_snapshot("answer")


def _on_answered(*_args: Any) -> None:
    QTimer.singleShot(120, lambda: _refresh_snapshot("question"))


def _install_hooks() -> None:
    for hook_name, callback in [
        ("reviewer_did_show_question", _on_show_question),
        ("reviewer_did_show_answer", _on_show_answer),
        ("reviewer_did_answer_card", _on_answered),
    ]:
        hook = getattr(gui_hooks, hook_name, None)
        if hook is not None:
            try:
                hook.append(callback)
            except Exception:
                pass


def _show_bridge_status() -> None:
    snapshot = _refresh_snapshot(None)
    status = "running" if _server else f"not running: {_server_error or 'unknown error'}"
    card = snapshot.get("cardId") or "-"
    drill = "yes" if snapshot.get("drillPayload") or snapshot.get("drillPayloadEncoded") else "no"
    tooltip(f"{ADDON_NAME}: {status}. Card {card}. Drill link: {drill}.", period=5000)


def _add_menu_item() -> None:
    action = QAction(ADDON_NAME + " status", mw)
    action.triggered.connect(_show_bridge_status)
    mw.form.menuTools.addAction(action)


_install_hooks()
QTimer.singleShot(1200, _start_server)
QTimer.singleShot(1600, _add_menu_item)
