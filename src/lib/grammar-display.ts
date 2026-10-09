import { GRAMMAR_LABS } from "@/data/grammar-labs";
import { GRAMMAR_LESSONS } from "@/data/learner-grammar";
import { displayNahuatl } from "./orthography";

const WORD = /[\p{L}\p{M}]+/gu;
const NAHUATL_FIELDS = new Set(["nahuatl", "nahuatlTitle", "answer", "breakdown"]);
// Paradigm columns mix forms with person labels and meanings. Only collect a
// cell as a form when the complete cell uses the source alphabet and separators.
const FORM_CELL = /^[acehiklmnpqstuwxyzāēīōū\s·+.,!?¿¡/()Øø-]+$/iu;

// Reviewed unambiguous grammar forms, never an automatic language detector.
// Short source tokens such as can/call can also be ordinary prose and must not
// become replacements merely because a dataset contains a Nahuatl homograph.
const SAFE_INLINE_FORMS = new Set(`
  achtohui ahui axcanah calli caltlamachtic caltlamachtiloyan
  chichi chichimeh chihua chihuilia chilli choca chpana
  cuahcuepa cuahuitl cualli cuepa eltoc huan huanya icniuh
  inihhuantin inmohhuantin tohhuantin inmomachtiah inmomachtianih
  inpilcihu intequitih intlamachtiah itztoc kohua kohuilia
  mazatl miac michimeh michin miqui mitz mitzmachtia mitzpalehui
  momachtia momachtiah momachtianih momachtihquetl momachtiz
  momauhtia motahtzin motlaloz nahuac natiuh neca nech nequi
  nicchihua niccua niccuaz nichoca nicnequi nicochiznequi
  niihcatoc niihcatoya niitztoc niitztoya nimocuepa nimomachtia
  nimomachtihquetl nimomachtiqui nimomachtiz nimomachtiznequi
  nimomauhtihqui nipilcihu nitequiti nitequitiz nitlachpana
  nitlacua nitlamachtia nitlaxcalchihua nitlaxcalcua nitlaxcaloa
  niuhqui niyatoc noaxca nocal nochocho nochtli nocihu nocniuh
  nopilahui nopitzohuan nouhquiya pilchichitzin pilcihu
  piltzin piltzitzin pitzo quena quetl quicu quicua quicuah
  quinmachtia tahtzin tequiti tequitih tequitini tequitiz tequitl
  ticchihua ticcua ticcuah ticcuahcuepah tikchihua timomachtia
  timomachtiah timomachtiti timomachtiz timomauhtihqui titequiti
  titequitih titequitiz titlacua titlamachtihquetl tlacua
  tlacual tlacui tlacuito tlahkwilhuia tlamachtia tlamachtianih
  tlamachtihquetl tlamachtilo tlaxcal tlaxcaloa tlazohcamati
  toaxca topilahuihuan tzin tzitzin xiccua xichoca xihu
  xitequiti xitlacua xitlazohcamatican xochitl yohui
`.trim().split(/\s+/));
const AFFIX_FORMS = new Set(["c", "cu", "qu", "cal", "cua", "tz", "z", "hu", "uh", "uc"]);
const REVIEWED_AFFIX_FORMS = new Set(["qui", "tzin", "tzitzin", "zquia", "tozquia"]);
const MACRON = /[āēīōūĀĒĪŌŪ]/u;

function collectForms(value: unknown, known: Set<string>) {
  if (Array.isArray(value)) {
    for (const item of value) collectForms(item, known);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "string" && (NAHUATL_FIELDS.has(key) ||
        ((key === "person" || key === "form") && FORM_CELL.test(child)))) {
        for (const word of child.match(WORD) ?? []) {
          if (displayNahuatl(word) !== word) known.add(word.normalize("NFC").toLowerCase());
        }
      } else if (typeof child === "object") collectForms(child, known);
    }
  }
}

const knownForms = new Set<string>();
collectForms(GRAMMAR_LABS, knownForms);
collectForms(GRAMMAR_LESSONS, knownForms);

/** Convert attested Nahuatl tokens in mixed prose without rewriting the prose. */
export function displayGrammarText(text: string, sourceReference = false): string {
  if (sourceReference) return text;
  return text.replace(WORD, (word, offset: number) => {
    const canonical = word.normalize("NFC").toLowerCase();
    const affixContext = /[·-]/u.test(text[offset - 1] ?? "") || /[·-]/u.test(text[offset + word.length] ?? "");
    const markedAffix = AFFIX_FORMS.has(canonical) && affixContext;
    const reviewedAffix = REVIEWED_AFFIX_FORMS.has(canonical) && affixContext;
    return (MACRON.test(canonical) || reviewedAffix || (knownForms.has(canonical) && (SAFE_INLINE_FORMS.has(canonical) || markedAffix)))
      ? displayNahuatl(word) : word;
  });
}

/** Historical tables keep their source columns visibly distinct from INALI. */
export function displayGrammarComparisonCell(text: string, header: string): string {
  return header.includes("INALI") ? displayGrammarText(text) : text;
}
