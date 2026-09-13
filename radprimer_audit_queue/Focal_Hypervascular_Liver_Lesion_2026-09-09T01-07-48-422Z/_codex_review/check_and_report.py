"""Validate the repaired captions and preserve all prior non-caption audit changes."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name("validate_caption_repair.py")), run_name="__main__")
