import { stripDiacritics, toInaliOrthography } from "../../public/nahuatl-orthography.js";

export { stripDiacritics, toInaliOrthography };

export function displayNahuatl(value: string | null | undefined): string {
  return toInaliOrthography(String(value ?? ""));
}

export function orthographySearchVariants(value: string): string[] {
  const plain = stripDiacritics(value).trim().toLowerCase();
  if (!plain) return [];

  const variants = new Set<string>([value.trim(), plain, toInaliOrthography(value).toLowerCase()]);
  const inali = toInaliOrthography(value).toLowerCase();
  if (inali === "axkana") variants.add("axtle");
  if (inali === "axtle") variants.add("axkana");
  if (inali === "piyali") variants.add("pialli");
  if (inali === "pialli") variants.add("piyali");
  if (inali === "tlaskamati") {
    variants.add("tlazcamati");
    variants.add("tlazohcamati");
    variants.add("tlasohkamati");
    variants.add("tlaxkamati");
  }
  if (["tlazcamati", "tlazohcamati", "tlasohkamati", "tlaxkamati"].includes(inali)) {
    variants.add("tlaskamati");
  }
  if (inali === "kenihki") {
    variants.add("kenijki");
    variants.add("keniki");
    variants.add("kenin");
    variants.add("kenikatsa");
    variants.add("queniuhqui");
    variants.add("quehatza");
  }
  if (["kenijki", "keniki", "kenin", "kenikatsa", "queniuhqui", "quehatza"].includes(inali)) {
    variants.add("kenihki");
  }
  if (inali === "kenihki motokah") {
    variants.add("kenihki motoka");
    variants.add("kenijki motokah");
    variants.add("keniki motokah");
    variants.add("kenin motokah");
    variants.add("tlen motokah");
    variants.add("queniuhqui motocah");
    variants.add("queniuhqui motokah");
    variants.add("queniuhqui motoca");
  }
  if (inali === "kenihki motoka") {
    variants.add("kenihki motokah");
    variants.add("kenijki motoka");
    variants.add("keniki motoka");
    variants.add("kenin motoka");
    variants.add("tlen motoka");
    variants.add("queniuhqui motocah");
    variants.add("queniuhqui motokah");
    variants.add("queniuhqui motoca");
  }
  if (["kenijki motoka", "keniki motoka", "kenin motoka", "tlen motoka", "kenijki motokah", "keniki motokah", "kenin motokah", "tlen motokah", "queniuhqui motocah", "queniuhqui motokah", "queniuhqui motoca"].includes(inali)) {
    variants.add("kenihki motokah");
    variants.add("kenihki motoka");
  }
  if (inali === "kenihki tiistok") {
    variants.add("kenijki tiistok");
    variants.add("keniki tiistok");
    variants.add("kenihkatsa tiistok");
    variants.add("quehatza tiitztoc");
    variants.add("queniuhqui tiitztoc");
  }
  if (["kenijki tiistok", "keniki tiistok", "kenihkatsa tiistok", "quehatza tiitztoc", "queniuhqui tiitztoc"].includes(inali)) {
    variants.add("kenihki tiistok");
  }
  if (inali === "kenihki tiya") {
    variants.add("kenijki tiya");
    variants.add("keniki tiya");
    variants.add("kenihkatsa tiya");
    variants.add("quehatza tiya");
  }
  if (["kenijki tiya", "keniki tiya", "kenihkatsa tiya", "quehatza tiya"].includes(inali)) {
    variants.add("kenihki tiya");
  }
  const possessedNameVariants: Record<string, string[]> = {
    notokah: ["notoka", "notocah", "notocaj", "notōcah"],
    notoka: ["notokah", "notocah", "notocaj", "notōcah"],
    motokah: ["motoka", "motocah", "motocaj", "motōcah"],
    motoka: ["motokah", "motocah", "motocaj", "motōcah"],
    itokah: ["itoka", "itocah", "itocaj", "ītōcah"],
    itoka: ["itokah", "itocah", "itocaj", "ītōcah"],
    totokah: ["totoka", "totocah", "totocaj", "totōcah"],
    totoka: ["totokah", "totocah", "totocaj", "totōcah"],
    amotokah: ["amotoka", "amotocah", "amotocaj", "amotōcah"],
    amotoka: ["amotokah", "amotocah", "amotocaj", "amotōcah"],
    intokah: ["intoka", "intocah", "intocaj", "intōcah"],
    intoka: ["intokah", "intocah", "intocaj", "intōcah"],
  };
  for (const variant of possessedNameVariants[inali] ?? []) {
    variants.add(variant);
  }
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
