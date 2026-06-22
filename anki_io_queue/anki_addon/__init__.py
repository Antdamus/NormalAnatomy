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
    QPixmap,
    QPushButton,
    QScrollArea,
    QTimer,
    QTextEdit,
    Qt,
    QVBoxLayout,
    sip,
)
from aqt.utils import showInfo, tooltip

DEFAULT_REPOSITORY_DIR = Path(r"C:\Users\josem.000\Documents\repository")
DEFAULT_QUEUE_PATH = Path.home() / "Downloads" / "RadPrimerIOQueue" / "queue.json"
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


class ImagePreviewDialog(QDialog):
    def __init__(self, pixmap: QPixmap, image_path: Path | None, parent=None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Image Preview")
        self._source_pixmap = pixmap
        self._zoom_factor = 1.0

        self.image_label = QLabel()
        self.image_label.setAlignment(self._qt_align_center())
        self.image_label.setStyleSheet("QLabel { background: #111; }")

        self.scroll_area = QScrollArea()
        self.scroll_area.setWidget(self.image_label)
        self.scroll_area.setWidgetResizable(False)
        self.scroll_area.setStyleSheet("QScrollArea { background: #111; border: 1px solid #555; }")

        fit_button = QPushButton("Fit")
        actual_button = QPushButton("100%")
        zoom_out_button = QPushButton("-")
        zoom_in_button = QPushButton("+")
        close_button = QPushButton("Close")

        fit_button.clicked.connect(self.fit_to_window)
        actual_button.clicked.connect(self.actual_size)
        zoom_out_button.clicked.connect(self.zoom_out)
        zoom_in_button.clicked.connect(self.zoom_in)
        close_button.clicked.connect(self.accept)

        path_label = QLabel(str(image_path) if image_path else "")
        path_label.setWordWrap(True)
        path_label.setStyleSheet("QLabel { color: #bbb; }")

        controls = QHBoxLayout()
        controls.addWidget(fit_button)
        controls.addWidget(actual_button)
        controls.addWidget(zoom_out_button)
        controls.addWidget(zoom_in_button)
        controls.addStretch(1)
        controls.addWidget(close_button)

        layout = QVBoxLayout()
        layout.addWidget(path_label)
        layout.addWidget(self.scroll_area, 1)
        layout.addLayout(controls)
        self.setLayout(layout)

        screen = QApplication.primaryScreen()
        if screen is not None:
            available = screen.availableGeometry()
            self.resize(int(available.width() * 0.72), int(available.height() * 0.78))
        else:
            self.resize(980, 720)
        QTimer.singleShot(0, self.fit_to_window)

    def _qt_align_center(self):
        try:
            return Qt.AlignmentFlag.AlignCenter
        except AttributeError:
            return Qt.AlignCenter

    def _qt_keep_aspect_ratio(self):
        try:
            return Qt.AspectRatioMode.KeepAspectRatio
        except AttributeError:
            return Qt.KeepAspectRatio

    def _qt_smooth_transformation(self):
        try:
            return Qt.TransformationMode.SmoothTransformation
        except AttributeError:
            return Qt.SmoothTransformation

    def _render_zoomed_image(self) -> None:
        if self._source_pixmap.isNull():
            return
        width = max(1, int(self._source_pixmap.width() * self._zoom_factor))
        height = max(1, int(self._source_pixmap.height() * self._zoom_factor))
        scaled = self._source_pixmap.scaled(
            width,
            height,
            self._qt_keep_aspect_ratio(),
            self._qt_smooth_transformation(),
        )
        self.image_label.setPixmap(scaled)
        self.image_label.resize(scaled.size())

    def fit_to_window(self) -> None:
        if self._source_pixmap.isNull():
            return
        viewport = self.scroll_area.viewport().size()
        width_factor = max(0.05, viewport.width() / max(1, self._source_pixmap.width()))
        height_factor = max(0.05, viewport.height() / max(1, self._source_pixmap.height()))
        self._zoom_factor = max(0.05, min(width_factor, height_factor))
        self._render_zoomed_image()

    def actual_size(self) -> None:
        self._zoom_factor = 1.0
        self._render_zoomed_image()

    def zoom_in(self) -> None:
        self._zoom_factor = min(8.0, self._zoom_factor * 1.25)
        self._render_zoomed_image()

    def zoom_out(self) -> None:
        self._zoom_factor = max(0.05, self._zoom_factor / 1.25)
        self._render_zoomed_image()


class IOQueueDialog(QDialog):
    def __init__(self) -> None:
        super().__init__(mw)
        self.setWindowTitle("Image Occlusion Queue Runner")
        self.resize(760, 520)

        self.queue_path: Path | None = None
        self.entries: list[QueueEntry] = []
        self.current_index: int = -1
        self._preview_pixmap: QPixmap | None = None
        self._preview_path: Path | None = None

        self.article_label = QLabel("Article: -")
        self.block_label = QLabel("Block: -")
        self.file_label = QLabel("Image: -")
        self.status_label = QLabel("Status: No queue loaded")

        self.caption_box = QTextEdit()
        self.caption_box.setReadOnly(True)
        self.image_preview_label = QLabel("Image preview")
        self.image_preview_label.setMinimumSize(300, 190)
        self.image_preview_label.setStyleSheet(
            "QLabel { border: 1px solid #555; border-radius: 8px; padding: 8px; "
            "background: #222; color: #ddd; }"
        )
        self.image_preview_label.setAlignment(self._qt_align_center())
        self.image_preview_label.setToolTip("Click to inspect the image")
        self.image_preview_label.setCursor(self._qt_pointing_hand_cursor())
        self.image_preview_label.mousePressEvent = self._open_preview_from_click

        self.auto_advance_checkbox = QCheckBox("Auto-advance after note add")
        self.auto_advance_checkbox.setChecked(True)
        self.auto_copy_image_checkbox = QCheckBox("Auto-copy current image on load/advance")
        self.auto_copy_image_checkbox.setChecked(True)
        self.auto_fill_caption_checkbox = QCheckBox("Try to append caption to added note")
        self.auto_fill_caption_checkbox.setChecked(True)
        self.auto_open_io_checkbox = QCheckBox("Auto-open current item in Image Occlusion")
        self.auto_open_io_checkbox.setChecked(True)
        self.auto_paste_io_checkbox = QCheckBox("Auto-paste image into Image Occlusion")
        self.auto_paste_io_checkbox.setChecked(True)

        load_button = QPushButton("Load Queue")
        load_default_button = QPushButton("Load Default Queue")
        open_io_button = QPushButton("Open Current in IO")
        prev_button = QPushButton("Previous")
        next_button = QPushButton("Next Pending")
        copy_caption_button = QPushButton("Copy Caption")
        copy_image_button = QPushButton("Copy Image")
        copy_path_button = QPushButton("Copy Image Path")
        mark_added_button = QPushButton("Mark Added")
        skip_button = QPushButton("Skip")

        load_button.clicked.connect(self.load_queue)
        load_default_button.clicked.connect(self.load_default_queue)
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

        control_layout = QVBoxLayout()
        control_layout.addLayout(meta_layout)
        control_layout.addWidget(self.auto_advance_checkbox)
        control_layout.addWidget(self.auto_copy_image_checkbox)
        control_layout.addWidget(self.auto_fill_caption_checkbox)
        control_layout.addWidget(self.auto_open_io_checkbox)
        control_layout.addWidget(self.auto_paste_io_checkbox)

        top_layout = QHBoxLayout()
        top_layout.addLayout(control_layout, 2)
        top_layout.addWidget(self.image_preview_label, 1)

        button_row = QHBoxLayout()
        button_row.addWidget(load_button)
        button_row.addWidget(load_default_button)
        button_row.addWidget(open_io_button)
        button_row.addWidget(prev_button)
        button_row.addWidget(next_button)
        button_row.addWidget(copy_caption_button)
        button_row.addWidget(copy_image_button)
        button_row.addWidget(copy_path_button)
        button_row.addWidget(mark_added_button)
        button_row.addWidget(skip_button)

        layout = QVBoxLayout()
        layout.addLayout(top_layout)
        layout.addWidget(QLabel("Caption"))
        layout.addWidget(self.caption_box)
        layout.addLayout(button_row)
        self.setLayout(layout)
        QTimer.singleShot(0, self.load_default_queue_if_available)

    def resizeEvent(self, event) -> None:
        super().resizeEvent(event)
        if hasattr(self, "image_preview_label"):
            self._fit_preview_pixmap()

    def _qt_align_center(self):
        try:
            return Qt.AlignmentFlag.AlignCenter
        except AttributeError:
            return Qt.AlignCenter

    def _qt_keep_aspect_ratio(self):
        try:
            return Qt.AspectRatioMode.KeepAspectRatio
        except AttributeError:
            return Qt.KeepAspectRatio

    def _qt_smooth_transformation(self):
        try:
            return Qt.TransformationMode.SmoothTransformation
        except AttributeError:
            return Qt.SmoothTransformation

    def _qt_pointing_hand_cursor(self):
        try:
            return Qt.CursorShape.PointingHandCursor
        except AttributeError:
            return Qt.PointingHandCursor

    def load_queue(self) -> None:
        initial_dir = DEFAULT_QUEUE_PATH.parent if DEFAULT_QUEUE_PATH.parent.exists() else Path.home()
        path_str, _ = QFileDialog.getOpenFileName(
            self,
            "Load Image Occlusion Queue",
            str(initial_dir),
            "Queue JSON (*.json)",
        )
        if not path_str:
            return

        self._load_queue_path(Path(path_str))

    def load_default_queue(self) -> None:
        if not DEFAULT_QUEUE_PATH.exists():
            QMessageBox.warning(
                self,
                "Default queue missing",
                f"Could not find the default queue:\n{DEFAULT_QUEUE_PATH}",
            )
            return
        self._load_queue_path(DEFAULT_QUEUE_PATH)

    def load_default_queue_if_available(self) -> None:
        if DEFAULT_QUEUE_PATH.exists():
            self._load_queue_path(DEFAULT_QUEUE_PATH)

    def _load_queue_path(self, path: Path) -> None:
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
            self._set_preview_message("No queue item loaded")
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
        self._render_image_preview(entry)
        if self.auto_copy_image_checkbox.isChecked():
            self.copy_image()
        if self.auto_open_io_checkbox.isChecked():
            QTimer.singleShot(0, self.launch_current_into_image_occlusion)

    def _set_preview_message(self, message: str) -> None:
        self._preview_pixmap = None
        self._preview_path = None
        self.image_preview_label.clear()
        self.image_preview_label.setText(message)

    def _render_image_preview(self, entry: QueueEntry | None) -> None:
        resolved_path = self._resolve_image_path(entry)
        if resolved_path is None:
            self._set_preview_message("Image preview unavailable")
            return
        pixmap = QPixmap(str(resolved_path))
        if pixmap.isNull():
            self._set_preview_message("Image preview unreadable")
            return
        self._preview_pixmap = pixmap
        self._preview_path = resolved_path
        self._fit_preview_pixmap()

    def _fit_preview_pixmap(self) -> None:
        pixmap = getattr(self, "_preview_pixmap", None)
        if pixmap is None or pixmap.isNull():
            return
        width = max(40, self.image_preview_label.width() - 18)
        height = max(40, self.image_preview_label.height() - 18)
        scaled = pixmap.scaled(
            width,
            height,
            self._qt_keep_aspect_ratio(),
            self._qt_smooth_transformation(),
        )
        self.image_preview_label.setText("")
        self.image_preview_label.setPixmap(scaled)

    def _open_preview_from_click(self, _event) -> None:
        pixmap = getattr(self, "_preview_pixmap", None)
        if pixmap is None or pixmap.isNull():
            tooltip("No image preview is available for this queue item.")
            return
        dialog = ImagePreviewDialog(pixmap, getattr(self, "_preview_path", None), self)
        exec_method = getattr(dialog, "exec", None) or getattr(dialog, "exec_", None)
        if callable(exec_method):
            exec_method()

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

    def copy_image(self) -> bool:
        entry = self.current_entry()
        if not entry:
            return False
        from aqt.qt import QImage

        resolved_path = self._resolve_image_path(entry)
        if not resolved_path:
            image_path = entry.preferred_path or entry.image_path
            QMessageBox.warning(self, "Image missing", f"Could not find image file:\n{image_path}")
            return False

        image = QImage(str(resolved_path))
        if image.isNull():
            QMessageBox.warning(self, "Image unreadable", f"Could not load image file:\n{resolved_path}")
            return False

        QApplication.clipboard().setImage(image)
        return True

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

    def _click_paste_image_button_in_editor_web(self, add_cards: AddCards, retries_left: int) -> bool:
        editor = getattr(add_cards, "editor", None)
        web = getattr(editor, "web", None) if editor else None
        if web is None:
            return False

        js = r"""
(() => {
  const textOf = (el) => [
    el.innerText,
    el.textContent,
    el.value,
    el.getAttribute && el.getAttribute("aria-label"),
    el.getAttribute && el.getAttribute("title")
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().toLowerCase();
  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const controls = Array.from(document.querySelectorAll(
    "button, [role='button'], input[type='button'], input[type='submit'], a"
  ));
  const target = controls.find((el) => {
    if (el.disabled || !visible(el)) {
      return false;
    }
    return /paste\s+image\s+(from\s+)?clipboard/.test(textOf(el));
  });
  if (!target) {
    return false;
  }
  target.scrollIntoView({ block: "center", inline: "center" });
  target.focus && target.focus();
  for (const type of ["pointerdown", "mousedown", "mouseup", "pointerup"]) {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  }
  target.click();
  return true;
})();
"""

        def on_done(result) -> None:
            if result:
                tooltip("Image pasted into Image Occlusion.")
                return
            if retries_left <= 0:
                tooltip("Image is on the clipboard. Click 'Paste Image from Clipboard' if it did not paste automatically.")
                return
            QTimer.singleShot(150, lambda: self._click_paste_image_button(add_cards, retries_left - 1))

        try:
            eval_with_callback = getattr(web, "evalWithCallback")
        except Exception:
            eval_with_callback = None
        if callable(eval_with_callback):
            try:
                eval_with_callback(js, on_done)
                return True
            except Exception:
                return False
        try:
            web.eval(js)
            return True
        except Exception:
            return False

    def _click_paste_image_button(self, add_cards: AddCards, retries_left: int = 8) -> None:
        if add_cards is None or sip.isdeleted(add_cards):
            return
        QApplication.processEvents()
        if self._click_button_by_text(add_cards, PASTE_BUTTON_TEXT_CANDIDATES):
            tooltip("Image pasted into Image Occlusion.")
            return
        if self._click_paste_image_button_in_editor_web(add_cards, retries_left):
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

        if not self.copy_image():
            return
        self._ensure_io_note_type(add_cards)
        self._prefill_fields(add_cards, entry.caption or "")

        add_cards.raise_()
        add_cards.activateWindow()
        if self.auto_paste_io_checkbox.isChecked():
            QTimer.singleShot(250, lambda: self._click_paste_image_button(add_cards))
        else:
            tooltip("Image copied to clipboard.")

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
