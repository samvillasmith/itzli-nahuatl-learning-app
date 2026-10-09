/** Current publisher listing, distinct from the unconfirmed version in the frozen import. */
export const COERLL_SOURCE_LICENSE_NOTICE = {
  name: "CC BY-SA (publisher listing; version unspecified)",
  shortName: "CC BY-SA",
  listingUrl: "https://coerll.utexas.edu/coerll/oer/nahuatlahtolli/",
} as const;

export const ITZLI_V3_CONTRIBUTION_LICENSE = {
  name: "CC BY-SA 4.0",
  url: "https://creativecommons.org/licenses/by-sa/4.0/",
} as const;

/** Correct a historical version label only for the identified publisher's source. */
export function displayedSourceLicense(sourceUrl: string | undefined, recordedLicense: string | undefined): string {
  try {
    if (new URL(sourceUrl ?? "").hostname === "tlahtolli.coerll.utexas.edu") return COERLL_SOURCE_LICENSE_NOTICE.name;
  } catch { /* Unknown references retain their recorded notice. */ }
  return recordedLicense ?? "";
}
