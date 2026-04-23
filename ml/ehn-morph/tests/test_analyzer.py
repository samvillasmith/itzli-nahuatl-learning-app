"""Integration-ish tests that rely on the Itzli SQLite DB being present.

Skipped automatically if the DB isn't locatable (see conftest).
"""

from __future__ import annotations


def _roles(a) -> list[str]:
    return [m.role for m in a.morphemes]


def _forms(a) -> list[str]:
    return [m.form for m in a.morphemes]


def test_bare_known_word_resolves(analyzer):
    a = analyzer.analyze("pialli")
    assert a.analyzable
    assert a.stem == "pialli"
    assert a.confidence > 0


def test_subject_prefix_is_stripped(analyzer):
    a = analyzer.analyze("nitequiti")
    assert a.analyzable
    assert a.stem == "tequiti"
    assert "subject" in _roles(a)
    assert a.morphemes[0].form == "ni-"


def test_past_subject_preterit_stacks(analyzer):
    # o- (PAST) + ni- (I) + tequiti + -c (PRET)
    a = analyzer.analyze("onitequitic")
    assert a.analyzable
    assert a.stem == "tequiti"
    roles = _roles(a)
    assert "past" in roles
    assert "subject" in roles
    assert "tense" in roles


def test_future_suffix(analyzer):
    a = analyzer.analyze("nitequitiz")
    assert a.analyzable
    assert a.stem == "tequiti"
    assert any(m.form == "-z" for m in a.morphemes)


def test_possessive_noun(analyzer):
    # no- + chan = "my home"
    a = analyzer.analyze("nochan")
    if a.analyzable:
        assert a.stem == "chan" or a.stem == "nichan"
        assert any(m.role == "possessor" for m in a.morphemes)


def test_unknown_returns_unanalyzable(analyzer):
    a = analyzer.analyze("xxxxxx")
    assert a.analyzable is False
    assert a.stem is None
    assert a.morphemes == []


def test_orthography_variant_maps_to_idiez(analyzer):
    # kuali → cualli (fixed substitution)
    a = analyzer.analyze("kuali")
    assert a.normalized == "cualli"
