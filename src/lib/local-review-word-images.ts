import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { isLocalReviewMode } from "./local-review";
import { isAppContentExcluded } from "./app-content-safety";
import { toInaliOrthography } from "./orthography";
import { getUnifiedVocabularyEntries } from "./unified-course-path";
import { getAllUnits, getUnitVocab } from "./db";
import { getReviewedVocabularyLabels } from "./reviewed-vocabulary-labels.cjs";
import { isSelectedSenseImageProofCurrent } from "./word-image-sense-eligibility";
import { vocabularyImageEntryId } from "./vocabulary-image-identity";
import type { WordImage } from "@/data/word-images";
import { assertImagePublicationGuard } from "../../scripts/lib/image-depiction-guardrails.js";
import { pendingImageFile } from "../../scripts/lib/reviewed-image-publication.cjs";

export type LocalReviewImageContext = {
  entryId: string; headword: string; meaningEn: string; meaningEs?: string | null;
  sourceFactReviewHash?: string | null;
};
type PendingImage = {
  entry_id: string; headword: string; meaning_en: string; meaning_es: string;
  image_sha256: string; local_path: string; source: string; author: string; alt: string;
  provenance: NonNullable<WordImage["provenance"]>;
};
type Store = Record<string, PendingImage>;
const form = (value: string) => toInaliOrthography(value).normalize("NFC").toLowerCase().trim();
let cachedStore: { file: string; modified: number; bytes: number; data: Store } | null = null;

function localStore(): Store {
  // The loopback launcher supplies this private path. Do not give the release
  // tracer a filesystem fallback that would package unpublished review data.
  const configured = process.env.ITZLI_LOCAL_IMAGE_REVIEW_LEDGER;
  if (!configured) return {};
  const file = path.resolve(configured);
  if (file !== path.resolve(process.cwd(), "data/openai-word-images-pending.json")) return {};
  const stat = fs.statSync(file);
  if (!cachedStore || cachedStore.file !== file || cachedStore.modified !== stat.mtimeMs || cachedStore.bytes !== stat.size) {
    cachedStore = { file, modified: stat.mtimeMs, bytes: stat.size, data: JSON.parse(fs.readFileSync(file, "utf8")) as Store };
  }
  return cachedStore.data;
}

function checkedPreview(context: LocalReviewImageContext, entry: PendingImage | undefined, root = process.cwd()) {
  if (!entry || !/^[A-Za-z0-9_-]{1,128}$/.test(context.entryId) ||
      entry.entry_id !== context.entryId || form(entry.headword) !== form(context.headword) ||
      entry.meaning_en !== context.meaningEn || context.meaningEs && entry.meaning_es !== context.meaningEs ||
      entry.provenance?.entry_id !== entry.entry_id || form(entry.provenance.headword ?? "") !== form(entry.headword) ||
      entry.provenance.meaning_en !== entry.meaning_en || entry.provenance.meaning_es !== entry.meaning_es ||
      isAppContentExcluded(context.entryId, context.headword, context.meaningEn, context.meaningEs)) return null;
  try {
    assertImagePublicationGuard(entry.headword, entry);
    const image: WordImage = {
      url: `/api/local-review/images/${encodeURIComponent(context.entryId)}?v=${entry.image_sha256}`,
      author: entry.author, alt: entry.alt, source: entry.source,
      license: "Generated illustration for local review", image_sha256: entry.image_sha256,
      review_status: "local-preview", review_scope: "local-review-preview",
      provenance: { entry_id: entry.entry_id, headword: entry.headword,
        meaning_en: entry.meaning_en, meaning_es: entry.meaning_es,
        source_fact_review_hash: entry.provenance.source_fact_review_hash,
        ...(entry.provenance.selected_sense ? { selected_sense: {
          meaning_en: entry.provenance.selected_sense.meaning_en,
          meaning_es: entry.provenance.selected_sense.meaning_es,
          source_fact_review_hash: entry.provenance.selected_sense.source_fact_review_hash,
        } } : {}),
      },
    };
    if (!isSelectedSenseImageProofCurrent(context.headword, context, image)) return null;
    const file = pendingImageFile(root, entry);
    return { image, file };
  } catch { return null; }
}

/** Reversible local preview only. Pending records never enter the published
 * resolver, release manifest or production response. Exact bytes stay private. */
export function getLocalReviewWordImages(contexts: readonly LocalReviewImageContext[]): Record<string, WordImage> {
  if (!isLocalReviewMode()) return {};
  let store: Store;
  try { store = localStore(); } catch { return {}; }
  const images: Record<string, WordImage> = {};
  for (const context of contexts) {
    if (isAppContentExcluded(context.entryId, context.headword, context.meaningEn, context.meaningEs)) continue;
    const imageId = context.meaningEs ? vocabularyImageEntryId({ id: context.entryId, display: context.headword,
      meaningEn: context.meaningEn, meaningEs: context.meaningEs }) : context.entryId;
    const preview = checkedPreview({ ...context, entryId: imageId }, store[imageId]);
    if (preview) images[context.entryId] = preview.image;
  }
  return images;
}

function currentEntryContext(entryId: string): LocalReviewImageContext | null {
  const reviewed = getReviewedVocabularyLabels().find(row => row.id === entryId);
  const expansion = getUnifiedVocabularyEntries().find(entry => entry.id === entryId);
  if (expansion) return { entryId, headword: expansion.display, meaningEn: expansion.meaningEn,
    meaningEs: expansion.meaningEs, sourceFactReviewHash: reviewed?.sourceFactReviewHash };
  if (!/^core-[1-9][0-9]*$/.test(entryId)) return null;
  const id = Number(entryId.slice(5));
  for (const unit of getAllUnits()) {
    const card = getUnitVocab(unit.lesson_number).find(item => item.id === id);
    if (card) return { entryId, headword: card.headword, meaningEn: card.gloss_en };
  }
  return null;
}

/** Called only by the loopback review image endpoint. A URL cannot select a
 * path or a stale file version, and current learner meanings are rechecked. */
export function localReviewImageResponse(entryId: string, version: string | null): Response | null {
  if (!isLocalReviewMode() || !/^[A-Za-z0-9_-]{1,128}$/.test(entryId) || !/^[a-f0-9]{64}$/.test(version ?? "")) return null;
  try {
    const context = currentEntryContext(entryId);
    if (!context) return null;
    const entry = localStore()[entryId];
    if (entry?.image_sha256 !== version) return null;
    const preview = checkedPreview(context, entry);
    if (!preview) return null;
    const bytes = fs.readFileSync(preview.file.localPath);
    // Validate these response bytes too, avoiding a changed file between reads.
    if (createHash("sha256").update(bytes).digest("hex") !== version) return null;
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "image/png", "Content-Length": String(bytes.length),
      "Cache-Control": "private,max-age=31536000,immutable", "ETag": `"${version}"`,
      "X-Content-Type-Options": "nosniff",
    } });
  } catch { return null; }
}
