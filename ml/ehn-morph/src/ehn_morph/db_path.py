"""Locate the Itzli SQLite database.

Mirrors scripts/_db-path.js on the Node side so Python + Node find the same
file under the same env-var conventions.
"""

from __future__ import annotations

import os
from pathlib import Path


def resolve_db_path() -> Path:
    """Return the first existing candidate SQLite path, or raise."""
    env = os.environ.get("DATABASE_PATH")
    if env:
        p = Path(env).expanduser()
        if p.exists():
            return p.resolve()

    here = Path(__file__).resolve()
    # ml/ehn-morph/src/ehn_morph/db_path.py → project root is 5 levels up
    project_root_candidates = [
        here.parents[4] if len(here.parents) > 4 else here.parent,  # project/
        here.parents[3] if len(here.parents) > 3 else here.parent,  # ml/
        here.parents[2] if len(here.parents) > 2 else here.parent,  # ehn-morph/
        Path.cwd(),
    ]

    db_names = ["fcn_master_lexicon_phase8_6_primer.sqlite"]

    for root in project_root_candidates:
        for name in db_names:
            local = root / name
            if local.exists():
                return local.resolve()
            # Also check the legacy sibling ../molina/curriculum/
            legacy = root / ".." / "molina" / "curriculum" / name
            if legacy.exists():
                return legacy.resolve()

    raise FileNotFoundError(
        "Could not find the Itzli SQLite database. "
        "Set DATABASE_PATH or place the .sqlite file in the project root."
    )
