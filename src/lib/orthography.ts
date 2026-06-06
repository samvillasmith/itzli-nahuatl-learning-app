export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function matchCase(source: string, replacement: string): string {
  if (source === source.toUpperCase()) return replacement.toUpperCase();
  if (source[0] === source[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function replaceWithCase(value: string, pattern: RegExp, replacement: string): string {
  return value.replace(pattern, (match) => matchCase(match, replacement));
}

export function toInaliOrthography(value: string): string {
  let out = stripDiacritics(value);

  out = replaceWithCase(out, /tz/gi, "ts");
  out = replaceWithCase(out, /z/gi, "s");
  out = replaceWithCase(out, /cu(?=[aeio])/gi, "kw");
  out = replaceWithCase(out, /ku(?=[aeio])/gi, "kw");
  out = replaceWithCase(out, /uc(?=\b|[^aeiou])/gi, "kw");
  out = replaceWithCase(out, /qu(?=[ei])/gi, "k");
  out = replaceWithCase(out, /hu(?=[aeio])/gi, "w");
  out = replaceWithCase(out, /uh(?=\b|[^aeiou])/gi, "w");
  out = replaceWithCase(out, /c(?=[ei])/gi, "s");
  out = replaceWithCase(out, /c(?!h)/gi, "k");

  return out;
}

export function displayNahuatl(value: string | null | undefined): string {
  return toInaliOrthography(String(value ?? ""));
}

export function orthographySearchVariants(value: string): string[] {
  const plain = stripDiacritics(value).trim().toLowerCase();
  if (!plain) return [];

  const variants = new Set<string>([value.trim(), plain, toInaliOrthography(value).toLowerCase()]);
  const legacyBase = plain
    .replace(/ts/g, "tz")
    .replace(/kw/g, "cu")
    .replace(/w/g, "hu")
    .replace(/k(?=[ei])/g, "qu")
    .replace(/k/g, "c");

  variants.add(legacyBase);
  variants.add(legacyBase.replace(/s(?=[ei])/g, "c"));
  variants.add(legacyBase.replace(/s/g, "z"));
  for (const variant of [...variants]) {
    variants.add(variant.replace(/([aeiou])l(?=([aeiou]|\b))/g, "$1ll"));
  }

  return [...variants].filter(Boolean);
}
