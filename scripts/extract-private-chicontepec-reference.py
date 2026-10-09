"""Private reference lookup only; never creates publishable lexical records."""
import hashlib
import json
from pathlib import Path
from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent
folder = root / "data/research/yan-garcia-nhe-20261004/verification/further-sources"
source = folder / "tlahtolxitlauhcayotl-chicontepec-reference.pdf"
reader = PdfReader(source)
pages = [{"pdf_page": number, "text": page.extract_text() or ""}
         for number, page in enumerate(reader.pages, 1)]
payload = {
    "schema_version": 1,
    "privacy": "private-research-only",
    "reference_url": "https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf",
    "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "source_title": "Tlahtolxitlauhcayotl: Chicontepec, Veracruz",
    "publication_year": 2016,
    "rights": "Copyright notices observed. No source prose, examples, arrangement or assets licensed by this extraction.",
    "review_status": "Text retrieval only: OCR/extraction, headwords, senses, morphology and English/Spanish labels require individual review.",
    "pages": pages,
}
(folder / "chicontepec-pages-private.json").write_text(
    json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"pages": len(pages), "characters": sum(len(p["text"]) for p in pages),
                  "source_sha256": payload["source_sha256"], "published_entries": 0}))
