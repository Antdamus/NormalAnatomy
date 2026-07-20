from __future__ import annotations

import base64
import html
import json
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
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
_skull_locator_sequence = 0
_skull_locator_state: dict[str, Any] = {
    "ok": True,
    "plane": "axial",
    "fraction": 0.5,
    "label": "",
    "sliceNumber": None,
    "totalSlices": None,
    "sequence": 0,
    "updatedAt": 0,
}
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
    _bytes_response(handler, status, body, "application/json; charset=utf-8")


def _bytes_response(handler: BaseHTTPRequestHandler, status: int, body: bytes, content_type: str) -> None:
    handler.send_response(status)
    handler.send_header("Content-Type", content_type)
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.end_headers()
    handler.wfile.write(body)


def _html_response(handler: BaseHTTPRequestHandler, status: int, html_text: str) -> None:
    _bytes_response(handler, status, html_text.encode("utf-8"), "text/html; charset=utf-8")


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


def _addon_asset_path(*parts: str) -> Path:
    return Path(__file__).resolve().parent.joinpath(*parts)


def _number_or_none(value: Any) -> float | int | None:
    if value is None:
        return None
    try:
        return float(value)
    except Exception:
        return None


def _update_skull_locator_state(payload: dict[str, Any]) -> dict[str, Any]:
    global _skull_locator_sequence, _skull_locator_state
    plane = str(payload.get("plane") or "axial").lower()
    if plane not in {"axial", "coronal", "sagittal"}:
        plane = "axial"
    fraction = _number_or_none(payload.get("fraction"))
    if fraction is None:
        fraction = 0.5
    fraction = max(0.0, min(1.0, float(fraction)))
    slice_number = _number_or_none(payload.get("sliceNumber"))
    total_slices = _number_or_none(payload.get("totalSlices"))
    with _state_lock:
        _skull_locator_sequence += 1
        _skull_locator_state = {
            "ok": True,
            "plane": plane,
            "fraction": fraction,
            "label": str(payload.get("label") or "")[:120],
            "sliceNumber": int(slice_number) if slice_number is not None else None,
            "totalSlices": int(total_slices) if total_slices is not None else None,
            "sequence": _skull_locator_sequence,
            "updatedAt": time.time(),
        }
        return dict(_skull_locator_state)


def _current_skull_locator_state() -> dict[str, Any]:
    with _state_lock:
        return dict(_skull_locator_state)


SKULL_LOCATOR_OBS_HTML = r"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Radiopaedia Skull Locator OBS</title>
  <style>
    html,
    body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: transparent;
    }
    .obs-root {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      background: transparent;
    }
    .slice-locator {
      position: relative;
      width: min(92vw, 92vh);
      height: min(92vw, 92vh);
      opacity: .98;
      transform-origin: center center;
      filter: drop-shadow(0 22px 34px rgba(0, 0, 0, .72));
    }
    .locator-shell {
      position: relative;
      width: 100%;
      height: 100%;
      transform: perspective(640px) rotateX(5deg) rotateY(-7deg);
      transform-origin: center center;
    }
    .locator-skull {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      pointer-events: none;
      user-select: none;
      -webkit-user-drag: none;
      filter:
        drop-shadow(0 0 10px rgba(255, 255, 255, .08))
        drop-shadow(0 14px 20px rgba(0, 0, 0, .56));
    }
    .locator-floor {
      position: absolute;
      left: 16%;
      right: 7%;
      bottom: 6%;
      height: 12%;
      border-radius: 999px;
      background: radial-gradient(ellipse at center, rgba(0, 0, 0, .48), rgba(0, 0, 0, 0) 72%);
      transform: perspective(300px) rotateX(68deg);
      pointer-events: none;
    }
    .locator-plane {
      position: absolute;
      z-index: 2;
      left: var(--locator-plane-left, 50%);
      top: var(--locator-plane-top, 50%);
      width: var(--locator-plane-width, 64%);
      height: var(--locator-plane-height, 10px);
      border: 1px solid rgba(186, 230, 253, .72);
      border-radius: 9px;
      background:
        linear-gradient(90deg, rgba(14, 165, 233, .08), rgba(125, 211, 252, .46), rgba(14, 165, 233, .12)),
        rgba(56, 189, 248, .2);
      box-shadow:
        0 0 16px rgba(56, 189, 248, .34),
        inset 0 0 14px rgba(224, 242, 254, .18);
      opacity: var(--locator-plane-opacity, .9);
      transform:
        translate(-50%, -50%)
        perspective(420px)
        rotateY(var(--locator-plane-yaw, 0deg))
        rotateX(var(--locator-plane-pitch, 0deg))
        rotate(var(--locator-plane-rotate, 0deg))
        skewY(var(--locator-plane-skew, 0deg))
        skewX(var(--locator-plane-skew-x, 0deg))
        scale(var(--locator-plane-scale, 1));
      transform-origin: center center;
      mix-blend-mode: screen;
      pointer-events: none;
    }
    .locator-plane::after {
      content: "";
      position: absolute;
      left: 8%;
      right: 8%;
      top: 50%;
      height: 3px;
      border-radius: 999px;
      background: rgba(224, 242, 254, .96);
      box-shadow: 0 0 10px rgba(125, 211, 252, .8);
      transform: translateY(-50%);
    }
    .slice-locator[data-plane="axial"] .locator-plane {
      border-color: rgba(186, 230, 253, .82);
      background:
        linear-gradient(104deg, rgba(14, 165, 233, .07) 0%, rgba(125, 211, 252, .45) 48%, rgba(224, 242, 254, .2) 54%, rgba(14, 165, 233, .1) 100%),
        rgba(56, 189, 248, .2);
      box-shadow:
        0 0 9px rgba(56, 189, 248, .22),
        inset 0 0 13px rgba(224, 242, 254, .17);
      clip-path: polygon(0 48%, 100% 20%, 100% 55%, 0 82%);
    }
    .slice-locator[data-plane="axial"] .locator-plane::after {
      left: -3%;
      right: -3%;
      top: 50%;
      transform: translateY(-50%) rotate(-12deg);
    }
    .slice-locator[data-plane="axial"] .locator-plane::before {
      content: "";
      position: absolute;
      inset: 8% 5%;
      border-top: 1px solid rgba(224, 242, 254, .48);
      border-bottom: 1px solid rgba(125, 211, 252, .28);
      background: linear-gradient(180deg, rgba(224, 242, 254, .14), rgba(14, 165, 233, 0) 56%);
      clip-path: polygon(0 48%, 100% 20%, 100% 55%, 0 82%);
    }
    .slice-locator[data-plane="coronal"] .locator-plane::after,
    .slice-locator[data-plane="sagittal"] .locator-plane::after {
      left: 50%;
      right: auto;
      top: 8%;
      bottom: 8%;
      width: 3px;
      height: auto;
      transform: translateX(-50%);
    }
    .slice-locator[data-plane="coronal"] .locator-plane::after {
      display: none;
    }
    .slice-locator[data-plane="coronal"] .locator-plane {
      border-color: rgba(186, 230, 253, .82);
      border-radius: 8px;
      background:
        linear-gradient(115deg, rgba(14, 165, 233, .08) 0%, rgba(125, 211, 252, .5) 46%, rgba(224, 242, 254, .2) 52%, rgba(14, 165, 233, .1) 100%),
        rgba(56, 189, 248, .22);
      clip-path: polygon(7% 0, 100% 3%, 93% 100%, 0 97%);
    }
    .slice-locator[data-plane="coronal"] .locator-plane::before {
      content: "";
      position: absolute;
      inset: 7% 11%;
      border-left: 2px solid rgba(224, 242, 254, .64);
      border-right: 1px solid rgba(125, 211, 252, .34);
      background: linear-gradient(90deg, rgba(224, 242, 254, .22), rgba(14, 165, 233, 0) 48%);
      clip-path: polygon(7% 0, 100% 3%, 93% 100%, 0 97%);
    }
    .slice-locator[data-plane="sagittal"] .locator-plane {
      border-color: rgba(186, 230, 253, .78);
      background:
        linear-gradient(118deg, rgba(14, 165, 233, .04) 0%, rgba(125, 211, 252, .42) 44%, rgba(224, 242, 254, .18) 51%, rgba(14, 165, 233, .09) 100%),
        rgba(56, 189, 248, .17);
      box-shadow:
        0 0 7px rgba(56, 189, 248, .18),
        inset 0 0 13px rgba(224, 242, 254, .16);
      clip-path: polygon(0 44%, 100% 10%, 100% 56%, 0 90%);
    }
    .slice-locator[data-plane="sagittal"] .locator-plane::after {
      left: -2%;
      right: -2%;
      top: 48%;
      bottom: auto;
      width: auto;
      height: 3px;
      transform: translateY(-50%) rotate(-30deg);
    }
    .slice-locator[data-plane="sagittal"] .locator-plane::before {
      content: "";
      position: absolute;
      inset: 5% 6%;
      border-left: 2px solid rgba(224, 242, 254, .56);
      border-right: 1px solid rgba(125, 211, 252, .3);
      background: linear-gradient(90deg, rgba(224, 242, 254, .16), rgba(14, 165, 233, 0) 52%);
      clip-path: polygon(0 44%, 100% 10%, 100% 56%, 0 90%);
    }
  </style>
</head>
<body>
  <main class="obs-root">
    <div class="slice-locator" data-plane="axial">
      <div class="locator-shell">
        <div class="locator-floor"></div>
        <img class="locator-skull" src="/radiopaedia-skull/skull.png" alt="">
        <div class="locator-plane"></div>
      </div>
    </div>
  </main>
  <script>
    const locator = document.querySelector(".slice-locator");
    let lastSequence = -1;

    function placePlane(plane, fraction) {
      const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0.5));
      let left = 50;
      let top = 50;
      let width = 64;
      let height = 9;
      let rotate = -3;
      let skew = 0;
      let skewX = 0;
      let yaw = 0;
      let pitch = 0;
      let scale = 1;
      let opacity = 0.9;

      if (plane === "sagittal") {
        left = 24 + f * 43;
        top = 51;
        width = 66;
        height = 118;
        rotate = 0;
        scale = 0.98;
        opacity = 0.5 + f * 0.1;
      } else if (plane === "coronal") {
        left = 32 + f * 34;
        top = 52 - f * 5;
        width = 58;
        height = 112;
        rotate = 1;
        skewX = -1;
        scale = 0.98;
        opacity = 0.52 + f * 0.14;
      } else {
        left = 50;
        top = 28 + f * 48;
        width = 90;
        height = 30;
        rotate = 0;
        opacity = 0.5 + f * 0.12;
      }

      locator.dataset.plane = plane || "axial";
      locator.style.setProperty("--locator-plane-left", `${left}%`);
      locator.style.setProperty("--locator-plane-top", `${top}%`);
      locator.style.setProperty("--locator-plane-width", `${width}%`);
      locator.style.setProperty("--locator-plane-height", `${height}%`);
      locator.style.setProperty("--locator-plane-rotate", `${rotate}deg`);
      locator.style.setProperty("--locator-plane-skew", `${skew}deg`);
      locator.style.setProperty("--locator-plane-skew-x", `${skewX}deg`);
      locator.style.setProperty("--locator-plane-yaw", `${yaw}deg`);
      locator.style.setProperty("--locator-plane-pitch", `${pitch}deg`);
      locator.style.setProperty("--locator-plane-scale", String(scale));
      locator.style.setProperty("--locator-plane-opacity", String(opacity));
    }

    async function pollState() {
      try {
        const response = await fetch("/radiopaedia-skull/state", { cache: "no-store" });
        const state = await response.json();
        if (state && state.sequence !== lastSequence) {
          lastSequence = state.sequence;
          const plane = ["axial", "coronal", "sagittal"].includes(state.plane) ? state.plane : "axial";
          const fraction = Number.isFinite(state.fraction) ? state.fraction : 0.5;
          placePlane(plane, fraction);
        }
      } catch (_error) {
        placePlane("axial", 0.5);
      } finally {
        window.setTimeout(pollState, 80);
      }
    }

    placePlane("axial", 0.5);
    pollState();
  </script>
</body>
</html>
"""


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
        if path == "/radiopaedia-skull/obs":
            _html_response(self, 200, SKULL_LOCATOR_OBS_HTML)
            return
        if path == "/radiopaedia-skull/skull.png":
            skull_path = _addon_asset_path("assets", "skull-locator.png")
            if not skull_path.exists():
                _json_response(self, 404, {"ok": False, "error": "Skull locator asset not installed."})
                return
            _bytes_response(self, 200, skull_path.read_bytes(), "image/png")
            return
        if path == "/radiopaedia-skull/state":
            _json_response(self, 200, _current_skull_locator_state())
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
            if path == "/radiopaedia-skull/state":
                state = _update_skull_locator_state(body)
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
