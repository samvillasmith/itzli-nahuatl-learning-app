#!/usr/bin/env python3
"""Compatibility entry point for Spanish Google + Nahuatl pronunciation rules.

The old raw-database bulk generator and --regen deletion path are retired.
Use export-audio-manifest.js first, then this script with --dry-run or an
explicit --execute. Original external-course recordings are preserved.
"""
import subprocess
from pathlib import Path
if __name__ == "__main__":
    import sys
    raise SystemExit(subprocess.call([
        "node", str(Path(__file__).with_name("generate-google-audio.js")), *sys.argv[1:]
    ]))
