import raw from "./word-images.json";

export type WordImage = {
  url: string;
  license: string;
  author: string;
  source?: string;
  title?: string;
};

const data = raw as Record<string, WordImage | null>;

/**
 * Returns an image for a vocab headword if one was found, or null.
 * Only returns images for concrete, imageable words.
 */
export function getWordImage(headword: string): WordImage | null {
  return data[headword] ?? null;
}
