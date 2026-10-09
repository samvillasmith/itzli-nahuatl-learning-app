import learnerManifest from "@/data/learner-generated-audio.json";

export type GeneratedAudioAsset = {
  id: string;
  url: string;
  ssml_sha256: string;
  audio_sha256?: string;
  byte_length?: number;
};
export type GeneratedAudioManifest = {
  schema_version: number;
  recipe_id: string;
  assets: GeneratedAudioAsset[];
  bindings: { reference_id: string; runtime_text: string; asset_id: string }[];
  held_reference_ids: string[];
  held_source_urls?: string[];
  learner_excluded_reference_ids?: string[];
  learner_content_policy?: { schema_version: number; headwords: string[]; exact_text: string[]; patterns: string[] };
  source_bindings?: { reference_id: string; runtime_text: string; url: string }[];
  source_asset_urls?: string[];
  lesson_assets: { id: string; asset_ids: string[]; source_urls?: string[] }[];
};
export type PracticeRecording = { url: string | null; kind: "source" | "synthetic"; generated: boolean };
const AUDIO_BASE = "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/audio-v3/";
const HASH = /^[a-f0-9]{64}$/;
function sourceAssetIdentity(url: string): string {
  try { const parsed = new URL(url); parsed.search = ""; parsed.hash = ""; return parsed.href; } catch { return url; }
}

/** A published binding must identify an immutable asset and exact current text.
 * Source spelling, punctuation, accents, and meaning contexts are never guessed. */
export function createGeneratedAudioIndex(manifest: GeneratedAudioManifest) {
  const validRecipe = manifest.schema_version === 1 && /^[a-z0-9][a-z0-9-]{0,89}$/.test(manifest.recipe_id);
  const assets = new Map<string, GeneratedAudioAsset>();
  for (const asset of manifest.assets) {
    if (!validRecipe || !HASH.test(asset.ssml_sha256) || !HASH.test(asset.id)) continue;
    const prefix = `${AUDIO_BASE}${manifest.recipe_id}/${asset.id}`;
    if (asset.url !== `${prefix}.wav` && asset.url !== `${prefix}.mp3`) continue;
    if (asset.audio_sha256 !== undefined && !HASH.test(asset.audio_sha256)) continue;
    if (asset.byte_length !== undefined && (!Number.isSafeInteger(asset.byte_length) || asset.byte_length <= 0)) continue;
    assets.set(asset.id, asset);
  }
  const held = new Set(manifest.held_reference_ids);
  const heldSourceUrls = new Set((manifest.held_source_urls ?? []).map(sourceAssetIdentity));
  const nativeByReference = new Map<string, Map<string, string | null>>();
  const nativeByText = new Map<string, string | null>();
  const sourceUrls = new Set<string>();
  for (const url of manifest.source_asset_urls ?? []) {
    // Passage audio can preload without becoming a word/utterance binding.
    if (validRecipe && !heldSourceUrls.has(sourceAssetIdentity(url)) && isOriginalSourceAudioAsset(url)) sourceUrls.add(url);
  }
  for (const binding of manifest.source_bindings ?? []) {
    if (!validRecipe || held.has(binding.reference_id) || heldSourceUrls.has(sourceAssetIdentity(binding.url)) || !binding.reference_id || !binding.runtime_text.trim() || !isOriginalSourceAudio(binding.url)) continue;
    sourceUrls.add(binding.url);
    const reference = nativeByReference.get(binding.reference_id) ?? new Map<string, string | null>();
    const existing = reference.get(binding.runtime_text);
    reference.set(binding.runtime_text, existing === undefined || existing === binding.url ? binding.url : null);
    nativeByReference.set(binding.reference_id, reference);
    const shared = nativeByText.get(binding.runtime_text);
    nativeByText.set(binding.runtime_text, shared === undefined || shared === binding.url ? binding.url : null);
  }
  const byReference = new Map<string, Map<string, GeneratedAudioAsset | null>>();
  const byText = new Map<string, GeneratedAudioAsset | null>();
  function add(map: Map<string, GeneratedAudioAsset | null>, text: string, asset: GeneratedAudioAsset) {
    const previous = map.get(text);
    map.set(text, previous === undefined || previous?.id === asset.id ? asset : null);
  }
  for (const binding of manifest.bindings) {
    const asset = assets.get(binding.asset_id);
    if (!asset || held.has(binding.reference_id) || !binding.reference_id || !binding.runtime_text.trim()) continue;
    const reference = byReference.get(binding.reference_id) ?? new Map<string, GeneratedAudioAsset | null>();
    add(reference, binding.runtime_text, asset);
    byReference.set(binding.reference_id, reference);
    add(byText, binding.runtime_text, asset);
  }
  const lessons = new Map(manifest.lesson_assets.map(lesson => [lesson.id,
    [...new Set(lesson.asset_ids)].flatMap(id => assets.has(id) ? [assets.get(id)!] : [])]));
  const lessonSources = new Map(manifest.lesson_assets.map(lesson => [lesson.id,
    [...new Set(lesson.source_urls ?? [])].filter(url => sourceUrls.has(url))]));
  const urls = new Set([...assets.values()].map(asset => asset.url));
  const byUrl = new Map([...assets.values()].map(asset => [asset.url, asset]));
  return {
    recipeId: validRecipe ? manifest.recipe_id : "",
    assets: [...assets.values()],
    sourceUrls: [...sourceUrls],
    hasSourceUrl: (url: string) => sourceUrls.has(url),
    isSourceUrlHeld: (url?: string | null) => Boolean(url && heldSourceUrls.has(sourceAssetIdentity(url))),
    hasReference: (id: string) => byReference.has(id) || nativeByReference.has(id),
    isHeld: (id?: string) => Boolean(id && held.has(id)),
    allowsText: (text: string, id?: string) => !id || (!byReference.has(id) && !nativeByReference.has(id)) ||
      Boolean(byReference.get(id)?.has(text) || nativeByReference.get(id)?.has(text)),
    hasUrl: (url: string) => urls.has(url),
    assetForUrl: (url: string) => byUrl.get(url) ?? null,
    lookup: (text: string, referenceId?: string) => {
      if (referenceId && held.has(referenceId)) return null;
      // A known identity with changed text cannot borrow another identity's clip.
      if (referenceId && (byReference.has(referenceId) || nativeByReference.has(referenceId))) return byReference.get(referenceId)?.get(text) ?? null;
      return byText.get(text) ?? null;
    },
    sourceLookup: (text: string, referenceId?: string) => {
      if (referenceId && held.has(referenceId)) return null;
      if (referenceId && (nativeByReference.has(referenceId) || byReference.has(referenceId))) return nativeByReference.get(referenceId)?.get(text) ?? null;
      return nativeByText.get(text) ?? null;
    },
    lessonAssets: (id: string) => lessons.get(id) ?? [],
    lessonSourceUrls: (id: string) => lessonSources.get(id) ?? [],
  };
}
export type GeneratedAudioIndex = ReturnType<typeof createGeneratedAudioIndex>;

export const GENERATED_AUDIO_MANIFEST = learnerManifest as GeneratedAudioManifest;
export const GENERATED_AUDIO_INDEX = createGeneratedAudioIndex(GENERATED_AUDIO_MANIFEST);
export const GENERATED_AUDIO_ASSETS = GENERATED_AUDIO_INDEX.assets;
export const ORIGINAL_SOURCE_AUDIO_URLS = GENERATED_AUDIO_INDEX.sourceUrls;
export const GENERATED_AUDIO_CACHE = `itzli-generated-audio-${GENERATED_AUDIO_INDEX.recipeId}`;
export const getGeneratedRecording = (text: string, referenceId?: string) => GENERATED_AUDIO_INDEX.lookup(text, referenceId);
export const isGeneratedAudioUrl = (url: string) => GENERATED_AUDIO_INDEX.hasUrl(url);

export function isOriginalSourceAudio(url: string) {
  return url.startsWith("https://tlahtolli.coerll.utexas.edu/");
}
function isOriginalSourceAudioAsset(url: string) {
  if (!isOriginalSourceAudio(url)) return false;
  try {
    const parsed = new URL(url);
    return !parsed.username && !parsed.password && !parsed.search && !parsed.hash &&
      /^\/wp-content\/uploads\/.+\.(mp3|wav|ogg|m4a)$/i.test(parsed.pathname);
  } catch { return false; }
}
function isOwnSyntheticAudio(url: string) {
  return isGeneratedAudioUrl(url) || /^\/audio(?:-google|-v3)?\//.test(url) ||
    url.startsWith("https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/vocab-reviewed");
}

/** Native recordings retain priority. Only published eligible bindings can
 * replace an unavailable or historical synthetic recording. */
export function resolvePracticeRecording({ text, url, kind, referenceId, held = false }: {
  text?: string;
  url?: string | null;
  kind?: "source" | "synthetic" | "source-recording" | "none";
  referenceId?: string;
  held?: boolean;
}, index: GeneratedAudioIndex = GENERATED_AUDIO_INDEX): PracticeRecording {
  if (held || index.isHeld(referenceId) || index.isSourceUrlHeld(url)) return { url: null, kind: "synthetic", generated: false };
  if (text && !index.allowsText(text, referenceId)) return { url: null, kind: "synthetic", generated: false };
  if (url && (isOriginalSourceAudio(url) || ((kind === "source" || kind === "source-recording") && !isOwnSyntheticAudio(url)))) {
    return { url, kind: "source", generated: false };
  }
  const original = text ? index.sourceLookup(text, referenceId) : null;
  if (original) return { url: original, kind: "source", generated: false };
  const generated = text ? index.lookup(text, referenceId) : null;
  if (generated) return { url: generated.url, kind: "synthetic", generated: true };
  return { url: url ?? null, kind: url && isOwnSyntheticAudio(url) ? "synthetic"
    : kind === "source" || kind === "source-recording" ? "source" : "synthetic", generated: false };
}
