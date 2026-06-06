#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
cd "$SCRIPT_DIR"

if command -v python3 >/dev/null 2>&1; then
  exec python3 "$SCRIPT_DIR/radprimer_watchers.py" watch-anki-images
fi

echo "python3 is required to run the RadPrimer Anki watcher on macOS."
echo "Install Python 3, then run this launcher again."
read "?Press Return to close this window."
