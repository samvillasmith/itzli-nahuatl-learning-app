export function projectLearnerAudioManifest<T extends {
  assets: { id: string }[];
  bindings: { reference_id: string; asset_id: string }[];
  held_reference_ids: string[];
  held_source_urls?: string[];
  learner_excluded_reference_ids?: string[];
  learner_content_policy?: { schema_version: number; headwords: string[]; exact_text: string[]; patterns: string[] };
  source_bindings?: { reference_id: string; url: string }[];
  source_asset_urls?: string[];
  lesson_assets: { id: string; asset_ids: string[]; source_urls?: string[] }[];
}>(manifest: T, policy?: { excluded_reference_ids?: string[]; excluded_source_urls?: string[];
  learner_content_policy?: { schema_version: number; headwords: string[]; exact_text: string[]; patterns: string[] } }): T;
export function getExcludedAudioDependencies(records: {
  id?: string; reference_id?: string;
  locator?: { parent_reference_id?: string; entry_id?: string; phrase_ids?: string[] };
  [key: string]: unknown;
}[], excludedReferenceIds: Iterable<string>, excludedEntryIds: Iterable<string>): { reference_id: string; reason: string }[];
