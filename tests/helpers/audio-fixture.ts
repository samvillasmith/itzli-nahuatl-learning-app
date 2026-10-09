import type { GeneratedAudioManifest } from "@/lib/generated-audio";
export function audioFixture(count = 3): GeneratedAudioManifest {
  const recipe = "spanish-air-b-2026-10-07";
  return { schema_version: 1, recipe_id: recipe, assets: Array.from({ length: count }, (_, index) => {
    const id = (index + 1).toString(16).padStart(64, "0");
    return { id, ssml_sha256: "a".repeat(64), url: `https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/audio-v3/${recipe}/${id}.mp3`, byte_length: 9 };
  }), bindings: [], held_reference_ids: [], source_bindings: [], lesson_assets: [] };
}
