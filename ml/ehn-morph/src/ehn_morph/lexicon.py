"""SQLite-backed lexicon lookup.

Resolves a candidate stem or surface form against the Itzli curriculum
vocabulary (the ~2000-entry `lesson_vocab` table). The wider 37K-entry
`lexicon_entries` table is checked as a fallback when present.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Iterator, Optional


class Lexicon:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.conn = sqlite3.connect(str(db_path))
        self.conn.row_factory = sqlite3.Row
        self._has_lexicon_entries = self._detect_lexicon_entries_table()

    def _detect_lexicon_entries_table(self) -> bool:
        cur = self.conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='lexicon_entries'"
        )
        return cur.fetchone() is not None

    def lookup(self, form: str) -> Optional[dict]:
        """Return the first matching entry, or None.

        Match order:
        1. exact match in lesson_vocab (audited curriculum)
        2. exact match in lexicon_entries (wider dictionary, if present)
        Comparison is case-insensitive.
        """
        if not form:
            return None

        row = self.conn.execute(
            """
            SELECT display_form AS headword, gloss_en, part_of_speech, lesson_number
            FROM lesson_vocab
            WHERE LOWER(display_form) = LOWER(?)
              AND gloss_en NOT LIKE '%MISPLACED%'
            LIMIT 1
            """,
            (form,),
        ).fetchone()
        if row:
            d = dict(row)
            d["source"] = "lesson_vocab"
            return d

        if self._has_lexicon_entries:
            try:
                row = self.conn.execute(
                    """
                    SELECT headword, gloss_en, part_of_speech
                    FROM lexicon_entries
                    WHERE LOWER(headword) = LOWER(?)
                    LIMIT 1
                    """,
                    (form,),
                ).fetchone()
                if row:
                    d = dict(row)
                    d.setdefault("lesson_number", None)
                    d["source"] = "lexicon_entries"
                    return d
            except sqlite3.OperationalError:
                # Table exists but column set differs — silently degrade.
                pass

        return None

    def iter_lesson_vocab(self) -> Iterator[dict]:
        """Yield every non-MISPLACED lesson_vocab row (~2000)."""
        cur = self.conn.execute(
            """
            SELECT display_form AS headword, gloss_en, part_of_speech, lesson_number
            FROM lesson_vocab
            WHERE gloss_en NOT LIKE '%MISPLACED%'
            ORDER BY lesson_number, rank
            """
        )
        for row in cur:
            yield dict(row)

    def iter_dialogue_utterances(self) -> Iterator[dict]:
        """Yield every AI-generated or attested dialogue line we can use for caching."""
        try:
            cur = self.conn.execute(
                """
                SELECT utterance_normalized AS utterance, translation_en, speaker_label
                FROM lesson_dialogues
                WHERE utterance_normalized IS NOT NULL
                  AND utterance_normalized <> ''
                """
            )
            for row in cur:
                yield dict(row)
        except sqlite3.OperationalError:
            return

    def close(self) -> None:
        self.conn.close()
