from ehn_morph.normalize import normalize, strip_diacritics


def test_strip_macrons():
    assert strip_diacritics("nēchmaca") == "nechmaca"
    assert strip_diacritics("tlahtōlli") == "tlahtolli"


def test_lowercase():
    assert normalize("Pialli") == "pialli"


def test_k_to_c_before_ao():
    assert normalize("kali") == "cali"
    assert normalize("koka") == "coca"


def test_k_to_qu_before_ei():
    assert normalize("kemah") == "quemah"
    assert normalize("kimati") == "quimati"


def test_j_to_h():
    # isolated j in a non-table word
    assert normalize("ajaja") == "ahaha"


def test_fixed_substitutions():
    assert normalize("nijchiua") == "nicchihua"
    assert normalize("tekiti") == "tequiti"
    assert normalize("kuali") == "cualli"
    assert normalize("kanke") == "campa"


def test_catli_stays_catli():
    # catli is NOT a variant of cualli; it means "which/who"
    assert normalize("catli") == "catli"


def test_empty():
    assert normalize("") == ""
    assert normalize("   ") == ""
