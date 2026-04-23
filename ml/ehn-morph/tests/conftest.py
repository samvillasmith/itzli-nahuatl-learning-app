"""Shared pytest fixtures.

Analyzer tests need the Itzli SQLite DB. If it's not reachable we skip
those tests rather than fail, so unit tests for pure logic (normalize,
prefixes) still run in any environment.
"""

from __future__ import annotations

import pytest

from ehn_morph.db_path import resolve_db_path


@pytest.fixture(scope="session")
def db_path():
    try:
        return resolve_db_path()
    except FileNotFoundError:
        pytest.skip(
            "SQLite DB not found; set DATABASE_PATH or place the .sqlite in project root."
        )


@pytest.fixture(scope="session")
def analyzer(db_path):
    from ehn_morph.analyzer import Analyzer

    az = Analyzer(db_path)
    yield az
    az.close()
