"""Offline tests need only Python stdlib; waveform QA uses the optional local numpy."""
import importlib.util
import json
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("audio_v3", Path(__file__).parents[1] / "scripts/generate-audio-v3.py")
audio = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audio)

class AudioV3Tests(unittest.TestCase):
    def test_diagnostics_have_no_learner_public_url(self):
        location = audio.diagnostic_location(audio.DEFAULT_OUTPUT / "fixture.wav")
        self.assertIsNone(location["audio_url"])
        self.assertEqual(location["release_status"], "private-diagnostic-only")
        self.assertTrue(location["private_audio_path"].startswith("data/audio-v3/diagnostics/mms/"))
        self.assertTrue(audio.DEFAULT_INDEX.is_relative_to(audio.ROOT / "data"))
        with self.assertRaisesRegex(ValueError, "private"):
            audio.diagnostic_location(audio.ROOT / "public/audio-v3/candidates/fixture.wav")

    def test_macrons_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "vowel length"):
            audio.prepare_text("ātl")

    def test_explicit_length_diagnostic_is_labelled(self):
        text, limitations = audio.prepare_text("ātl", length_diagnostic=True)
        self.assertEqual(text, "atl")
        self.assertIn("vowel length", limitations[0])

    def test_never_invents_word_breaks_inside_clusters(self):
        self.assertEqual(audio.prepare_text("intla")[0], "intla")
        self.assertEqual(audio.prepare_text("icniuh")[0], "icniuh")

    def test_unknown_symbols_are_not_deleted(self):
        for text in ["na🙂", "ñā", "ø", "ni (stage direction)"]:
            with self.assertRaises(ValueError):
                audio.prepare_text(text)

    def test_practical_w_needs_explicit_diagnostic(self):
        with self.assertRaisesRegex(ValueError, "lacks w"):
            audio.prepare_text("nawatl")
        text, limitations = audio.prepare_text("nawatl", practical_w=True)
        self.assertEqual(text, "nahuatl")
        self.assertTrue(limitations)

    def test_keeps_apostrophe_and_sentence_boundaries(self):
        self.assertEqual(audio.prepare_text("naʼ, ta.")[0], "na' ta")

    def test_pinned_model_and_settings(self):
        self.assertEqual(audio.MODEL_ID, "facebook/mms-tts-nhe")
        self.assertEqual(len(audio.REVISION), 40)
        self.assertEqual(audio.SEED, 555)
        self.assertEqual(audio.SETTINGS["speaking_rate"], 1)

    def test_unknown_missing_metadata_not_supported(self):
        self.assertFalse(audio.source_supported({"generation_allowed": True}))
        self.assertFalse(audio.source_supported({"content_review": "source-form", "source_refs": []}))

    def test_frozen_text_hash_required(self):
        row = {"kind": "vocab", "id": "1", "runtime_text": "na", "synthesis_text": "na",
               "text_sha256": audio.digest("old"), "synthesis_text_sha256": audio.digest("na")}
        with tempfile.TemporaryDirectory(prefix="itzli-audio-manifest-") as directory:
            path = Path(directory) / "manifest.json"
            path.write_text(json.dumps({"schema_version": 1, "records": [row]}), encoding="utf8")
            with self.assertRaisesRegex(ValueError, "Changed text"):
                audio.load_records(path)

    def test_execute_rejects_unsupported_before_loading_model(self):
        row = {"kind": "vocab", "id": "1", "runtime_text": "ātl", "synthesis_text": "ātl",
               "text_sha256": audio.digest("ātl"), "synthesis_text_sha256": audio.digest("ātl"),
               "generation_allowed": True, "content_review": "source-form",
               "source_refs": [{"source_url": "https://tlahtolli.coerll.utexas.edu/test/"}]}
        with tempfile.TemporaryDirectory(prefix="itzli-audio-manifest-") as directory:
            path = Path(directory) / "manifest.json"
            path.write_text(json.dumps({"schema_version": 1, "records": [row]}), encoding="utf8")
            with patch.object(audio, "load_model") as model_loader:
                self.assertEqual(audio.main(["--manifest", str(path), "--execute"]), 1)
                model_loader.assert_not_called()

if __name__ == "__main__":
    unittest.main()
