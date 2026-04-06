from __future__ import annotations

import html
import json
from dataclasses import dataclass
from pathlib import Path

from aqt import dialogs, mw, gui_hooks
from aqt.addcards import AddCards
from aqt.qt import (
    QAction,
    QApplication,
    QCheckBox,
    QDialog,
    QFileDialog,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QMessageBox,
    QPushButton,
    QTimer,
    QTextEdit,
    QVBoxLayout,
    sip,
)
from aqt.utils import showInfo, tooltip

DEFAULT_REPOSITORY_DIR = Path(r"C:\Users\josem.000\Documents\repository")
CAPTION_FIELD_CANDIDATES = [
    "Back Extra",
    "Header",
    "Remarks",
    "Remark",
    "Extra 1",
    "Extra1",
    "Extra",
    "Source",
    "Sources",
    "Notes",
]
IO_NOTE_TYPE_CANDIDATES = [
    "Image Occlusion",
    "Image Occlusion Enhanced",
]
PASTE_BUTTON_TEXT_CANDIDATES = [
    "paste image from clipboard",
    "paste image",
]


@dataclass
class QueueEntry:
    queue_id: str
    article_title: str
    topic: str
    block_label: str
    block_kind: str
    block_index: int
    group_numbers: list[int]
    source_number: int
    base_name: str
    image_filename: str
    annotated_filename: str
    caption: str
    image_path: str
    annotated_path: str
    preferred_path: str
    status: str = "pending"
    notes: str = ""


class IOQueueDialog(QDialog):
    def __init__(self) -> None:
        super().__init__(mw)
        self.setWindowTitle("Image Occlusion Queue Runner")
        self.resize(760, 520)

        self.queue_path: Path | None = None
        self.entries: list[QueueEntry] = []
        self.current_index: int = -1

        self.article_label = QLabel("Article: -")
        self.block_label = QLabel("Block: -")
        self.file_label = QLabel("Image: -")
        self.status_label = QLabel("Status: No queue loaded")

        self.caption_box = QTextEdit()
        self.caption_box.setReadOnly(True)

        self.auto_advance_checkbox = QCheckBox("Auto-advance after note add")
        self.auto_advance_checkbox.setChecked(True)
        self.auto_copy_image_checkbox = QCheckBox("Auto-copy current image on load/advance")
        self.auto_copy_image_checkbox.setChecked(True)
        self.auto_fill_caption_checkbox = QCheckBox("Try to append caption to added note")
        self.auto_fill_caption_checkbox.setChecked(True)
        self.auto_open_io_checkbox = QCheckBox("Auto-open current item in Image Occlusion")
        self.auto_open_io_checkbox.setChecked(True)

        load_button = QPushButton("Load Queue")
        open_io_button = QPushButton("Open Current in IO")
        prev_button = QPushButton("Previous")
        next_button = QPushButton("Next Pending")
        copy_caption_button = QPushButton("Copy Caption")
        copy_image_button = QPushButton("Copy Image")
        copy_path_button = QPushButton("Copy Image Path")
        mark_added_button = QPushButton("Mark Added")
        skip_button = QPushButton("Skip")

        load_button.clicked.connect(self.load_queue)
        open_io_button.clicked.connect(self.launch_current_into_image_occlusion)
        prev_button.clicked.connect(self.prev_item)
        next_button.clicked.connect(self.next_pending)
        copy_caption_button.clicked.connect(self.copy_caption)
        copy_image_button.clicked.connect(self.copy_image)
        copy_path_button.clicked.connect(self.copy_image_path)
        mark_added_button.clicked.connect(self.mark_added)
        skip_button.clicked.connect(self.skip_current)

        meta_layout = QGridLayout()
        meta_layout.addWidget(self.article_label, 0, 0)
        meta_layout.addWidget(self.block_label, 1, 0)
        meta_layout.addWidget(self.file_label, 2, 0)
        meta_layout.addWidget(self.status_label, 3, 0)

        button_row = QHBoxLayout()
        button_row.addWidget(load_button)
        button_row.addWidget(open_io_button)
        button_row.addWidget(prev_button)
        button_row.addWidget(next_button)
        button_row.addWidget(copy_caption_button)
        button_row.addWidget(copy_image_button)
        button_row.addWidget(copy_path_button)
        button_row.addWidget(mark_added_button)
        button_row.addWidget(skip_button)

        layout = QVBoxLayout()
        layout.addLayout(meta_layout)
        layout.addWidget(self.auto_advance_checkbox)
        layout.addWidget(self.auto_copy_image_checkbox)
        layout.addWidget(self.auto_fill_caption_checkbox)
        layout.addWidget(self.auto_open_io_checkbox)
        layout.addWidget(QLabel("Caption"))
        layout.addWidget(self.caption_box)
        layout.addLayout(button_row)
        self.setLayout(layout)

    def load_queue(self) -> None:
        path_str, _ = QFileDialog.getOpenFileName(
            self,
            "Load Image Occlusion Queue",
            str(Path.home()),
            "Queue JSON (*.json)",
        )
        if not path_str:
            return

        path = Path(path_str)
        data = json.loads(path.read_text(encoding="utf-8"))
        self.queue_path = path
        self.entries = [QueueEntry(**item) for item in data.get("items", [])]
        self.current_index = self._first_pending_index()
        self._render_current()

    def _first_pending_index(self) -> int:
        for idx, entry in enumerate(self.entries):
            if entry.status == "pending":
                return idx
        return 0 if self.entries else -1

    def _render_current(self) -> None:
        if self.current_index < 0 or self.current_index >= len(self.entries):
            self.article_label.setText("Article: -")
            self.block_label.setText("Block: -")
            self.file_label.setText("Image: -")
            self.status_label.setText("Status: Queue empty or complete")
            self.caption_box.setPlainText("")
            return

        entry = self.entries[self.current_index]
        self.article_label.setText(f"Article: {entry.article_title or '-'}")
        self.block_label.setText(
            f"Block: {entry.block_label} | Source #{entry.source_number or '-'} | Status: {entry.status}"
        )
        self.file_label.setText(f"Image: {entry.preferred_path or entry.image_path or '-'}")
        self.status_label.setText(
            f"Status: item {self.current_index + 1} of {len(self.entries)}"
        )
        self.caption_box.setPlainText(entry.caption or "")
        if self.auto_copy_image_checkbox.isChecked():
            self.copy_image()
        if self.auto_open_io_checkbox.isChecked():
            QTimer.singleShot(0, self.launch_current_into_image_occlusion)

    def _save_queue(self) -> None:
        if self.queue_path is None:
            return
        payload = {
            "article_title": self.entries[0].article_title if self.entries else "",
            "topic": self.entries[0].topic if self.entries else "",
            "total_items": len(self.entries),
            "items": [entry.__dict__ for entry in self.entries],
        }
        self.queue_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    def current_entry(self) -> QueueEntry | None:
        if self.current_index < 0 or self.current_index >= len(self.entries):
            return None
        return self.entries[self.current_index]

    def _resolve_image_path(self, entry: QueueEntry | None) -> Path | None:
        if entry is None:
            return None

        image_path = entry.preferred_path or entry.image_path
        if image_path:
            candidate = Path(image_path)
            if candidate.exists():
                return candidate
            if DEFAULT_REPOSITORY_DIR.exists():
                repository_candidate = DEFAULT_REPOSITORY_DIR / candidate.name
                if repository_candidate.exists():
                    return repository_candidate
        return None

    def _html_caption(self, caption: str) -> str:
        return html.escape(caption or "").replace("\n", "<br>")

    def copy_caption(self) -> None:
        entry = self.current_entry()
        if not entry:
            return
        QApplication.clipboard().setText(entry.caption or "")

    def copy_image_path(self) -> None:
        entry = self.current_entry()
        if not entry:
            return
        QApplication.clipboard().setText(entry.preferred_path or entry.image_path or "")

    def copy_image(self) -> None:
        entry = self.current_entry()
        if not entry:
            return
        from aqt.qt import QImage

        resolved_path = self._resolve_image_path(entry)
        if not resolved_path:
            image_path = entry.preferred_path or entry.image_path
            QMessageBox.warning(self, "Image missing", f"Could not find image file:\n{image_path}")
            return

        image = QImage(str(resolved_path))
        if image.isNull():
            QMessageBox.warning(self, "Image unreadable", f"Could not load image file:\n{resolved_path}")
            return

        QApplication.clipboard().setImage(image)

    def _get_open_add_cards(self) -> AddCards | None:
        try:
            dialog_entry = dialogs._dialogs.get("AddCards")
        except Exception:
            return None
        if not dialog_entry:
            return None
        dialog = dialog_entry[1]
        if dialog is None or sip.isdeleted(dialog):
            return None
        return dialog

    def _ensure_add_cards(self) -> AddCards | None:
        dialog = self._get_open_add_cards()
        if dialog is None:
            try:
                dialogs.open("AddCards", mw)
            except Exception:
                dialog = None
            else:
                dialog = self._get_open_add_cards()
        if dialog is None:
            try:
                dialog = AddCards(mw)
                dialog.show()
            except Exception as exc:
                QMessageBox.warning(
                    self,
                    "Could not open Add window",
                    f"Failed to open the Anki Add window:\n{exc}",
                )
                return None
        dialog.show()
        dialog.raise_()
        dialog.activateWindow()
        QApplication.processEvents()
        return dialog

    def _find_io_model(self):
        for name in IO_NOTE_TYPE_CANDIDATES:
            model = mw.col.models.by_name(name)
            if model:
                return model
        return None

    def _load_note_into_editor(self, add_cards: AddCards, note) -> bool:
        editor = getattr(add_cards, "editor", None)
        if editor is None:
            return False
        for method_name in ("set_note", "setNote"):
            method = getattr(editor, method_name, None)
            if callable(method):
                try:
                    method(note)
                    return True
                except Exception:
                    pass
        try:
            editor.note = note
        except Exception:
            return False
        for method_name in ("loadNote", "load_note"):
            method = getattr(editor, method_name, None)
            if callable(method):
                try:
                    method()
                except TypeError:
                    try:
                        method(note)
                    except Exception:
                        pass
                except Exception:
                    pass
        return True

    def _ensure_io_note_type(self, add_cards: AddCards):
        model = self._find_io_model()
        if model is None:
            return None
        try:
            mw.col.models.set_current(model)
        except Exception:
            pass
        editor = getattr(add_cards, "editor", None)
        note = getattr(editor, "note", None) if editor else None
        current_name = None
        try:
            current_name = note.note_type()["name"] if note else None
        except Exception:
            current_name = None
        if current_name == model["name"]:
            return note
        try:
            new_note = mw.col.new_note(model)
        except Exception:
            return note
        if self._load_note_into_editor(add_cards, new_note):
            return new_note
        return note

    def _prefill_fields(self, add_cards: AddCards, caption: str) -> bool:
        editor = getattr(add_cards, "editor", None)
        note = getattr(editor, "note", None) if editor else None
        if note is None:
            return False

        try:
            available_fields = list(note.keys())
        except Exception:
            return False

        changed = False
        if "Header" in available_fields and note["Header"]:
            note["Header"] = ""
            changed = True

        target_field = "Back Extra" if "Back Extra" in available_fields else None
        if target_field is None:
            target_field = next(
                (name for name in CAPTION_FIELD_CANDIDATES if name in available_fields),
                None,
            )
        if target_field is None:
            return changed

        html_caption = self._html_caption(caption)
        if note[target_field] != html_caption:
            note[target_field] = html_caption
            changed = True

        if changed:
            self._load_note_into_editor(add_cards, note)
        return changed

    def _click_button_by_text(self, root, candidates: list[str]) -> bool:
        if root is None:
            return False
        for button in root.findChildren(QPushButton):
            text = (button.text() or "").strip().lower()
            if any(candidate in text for candidate in candidates) and button.isEnabled():
                button.click()
                return True
        return False

    def _click_paste_image_button(self, add_cards: AddCards, retries_left: int = 8) -> None:
        if add_cards is None or sip.isdeleted(add_cards):
            return
        if self._click_button_by_text(add_cards, PASTE_BUTTON_TEXT_CANDIDATES):
            return
        if retries_left <= 0:
            tooltip("Image is on the clipboard. Click 'Paste Image from Clipboard' if it did not paste automatically.")
            return
        QTimer.singleShot(150, lambda: self._click_paste_image_button(add_cards, retries_left - 1))

    def launch_current_into_image_occlusion(self) -> None:
        entry = self.current_entry()
        if entry is None:
            return

        image_path = self._resolve_image_path(entry)
        if image_path is None:
            QMessageBox.warning(self, "Image missing", f"Could not find image file for:\n{entry.block_label}")
            return

        add_cards = self._ensure_add_cards()
        if add_cards is None:
            return

        self.copy_image()
        self._ensure_io_note_type(add_cards)
        self._prefill_fields(add_cards, entry.caption or "")

        QTimer.singleShot(150, lambda: self._click_paste_image_button(add_cards))
        add_cards.raise_()
        add_cards.activateWindow()

    def mark_added(self) -> None:
        entry = self.current_entry()
        if not entry:
            return
        entry.status = "added"
        self._save_queue()
        self.next_pending()

    def skip_current(self) -> None:
        entry = self.current_entry()
        if not entry:
            return
        entry.status = "skipped"
        self._save_queue()
        self.next_pending()

    def prev_item(self) -> None:
        if not self.entries:
            return
        self.current_index = max(0, self.current_index - 1)
        self._render_current()

    def next_pending(self) -> None:
        if not self.entries:
            return

        for idx in range(self.current_index + 1, len(self.entries)):
            if self.entries[idx].status == "pending":
                self.current_index = idx
                self._render_current()
                return

        self.current_index = len(self.entries) - 1
        self._render_current()
        showInfo("No more pending queue items.")

    def auto_advance_from_note_add(self) -> None:
        if not self.auto_advance_checkbox.isChecked():
            return
        entry = self.current_entry()
        if not entry or entry.status != "pending":
            return
        self.mark_added()

    def auto_fill_caption_on_added_note(self, note) -> None:
        if not self.auto_fill_caption_checkbox.isChecked():
            return
        entry = self.current_entry()
        if not entry or not entry.caption or note is None:
            return

        try:
            available_fields = list(note.keys())
        except Exception:
            return

        target_field = next((name for name in CAPTION_FIELD_CANDIDATES if name in available_fields), None)
        if target_field is None:
            return

        try:
            existing = str(note[target_field] or "").strip()
            caption_html = self._html_caption(entry.caption)
            if caption_html in existing or entry.caption in existing:
                return
            note[target_field] = caption_html if not existing else f"{existing}<br>{caption_html}"
            note.flush()
        except Exception:
            return


runner_dialog: IOQueueDialog | None = None


def open_runner() -> None:
    global runner_dialog
    if runner_dialog is None:
        runner_dialog = IOQueueDialog()
    runner_dialog.show()
    runner_dialog.raise_()
    runner_dialog.activateWindow()


def on_add_note(*_args, **_kwargs) -> None:
    if runner_dialog is None:
        return
    note = None
    for arg in _args:
        if hasattr(arg, "keys") and hasattr(arg, "flush"):
            note = arg
            break
    if note is None:
        for arg in _args:
            if isinstance(arg, int):
                try:
                    note = mw.col.get_note(arg)
                    break
                except Exception:
                    continue
    runner_dialog.auto_fill_caption_on_added_note(note)
    runner_dialog.auto_advance_from_note_add()


action = QAction("Image Occlusion Queue Runner", mw)
action.triggered.connect(open_runner)
mw.form.menuTools.addAction(action)

if hasattr(gui_hooks, "add_cards_did_add_note"):
    gui_hooks.add_cards_did_add_note.append(on_add_note)
