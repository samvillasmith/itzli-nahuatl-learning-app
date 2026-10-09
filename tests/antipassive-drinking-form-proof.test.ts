import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const { verifyAntipassiveDrinkingForm, ANTIPASSIVE_DRINKING_PROOF, DICTIONARY_SHA, HIDALGO_SHA, RULE_SHA, COURSE_SHA, DICTIONARY_URL, HIDALGO_URL, RULE_URL } = require('../scripts/lib/antipassive-drinking-form-proof.js');
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
function fixture() {
  return {
    entry: { display: 'nitlai', sourceSpelling: 'nitlaī', meaningEn: 'I drink alcohol', meaningEs: 'bebo alcohol', partOfSpeech: 'verb', formKind: 'rule-composed-verb-form',
      sourceUrl: HIDALGO_URL + '#page=79', audioUrl: null, audioKind: 'missing', verification: { formEvidence: 'qualified-reviewed-rule-composition' },
      sourceLocator: { sourceType: 'productive-antipassive-drinking-form', attestedHeadword: null, referenceFileSha256: HIDALGO_SHA, referencePdfPage: 79,
        sourceUrl: HIDALGO_URL + '#page=79', antipassiveDrinkingProof: clone(ANTIPASSIVE_DRINKING_PROOF) } },
    dictionary: { source_sha256: DICTIONARY_SHA, reference_url: DICTIONARY_URL, pages: [
      { pdf_page: 46, text: 'ĀTLĪ. tlach1. ni.\nachi. ĀTL, Ī3.' },
      { pdf_page: 230, text: 'Ī3. tlach1. ĀTLĪ huan ONĪ iyollo: axcanah motequihuia icelti.\n[Mc. 22r]' }] },
    hidalgo: { source_sha256: HIDALGO_SHA, reference_url: HIDALGO_URL, pages: [{ pdf_page: 79, text: 'tlai. vb. t.\nbebida alcohólica' }] },
    mechanism: { source_sha256: RULE_SHA, reference_url: RULE_URL, pages: [{ pdf_page: 3, text: 'Tzocohuite, huasteca oriental [nhe]' },
      { pdf_page: 4, text: 'antipasivo; intransitiva; nitlakwa' }] },
    course: { lessons: [{ number: 6, sections: [{ body: ['', 'present tense; singular'] }, { body: ['', 'ni – (verbal base) – ø', '', '', '', '', '', '', 'I am from'] }] }] }
  };
}
type Fixture = ReturnType<typeof fixture>;
const verify = (x: Fixture) => verifyAntipassiveDrinkingForm(x.entry, x.dictionary, DICTIONARY_SHA, x.hidalgo, HIDALGO_SHA, x.mechanism, RULE_SHA, x.course, COURSE_SHA);
describe('one qualified alcohol-drinking composition', () => {
  it('accepts the exact bounded proof with the source POS disagreement preserved', () => expect(() => verify(fixture())).not.toThrow());
  const cases: [string, (x: Fixture) => void][] = [
    ['plain drinking meaning', x => { x.entry.meaningEn = 'I drink'; }], ['water meaning', x => { x.entry.meaningEs = 'bebo agua'; }],
    ['second subject', x => { x.entry.sourceLocator.antipassiveDrinkingProof.composition.subject.person = 2; }],
    ['plural', x => { x.entry.sourceLocator.antipassiveDrinkingProof.composition.numberSuffix = 'h'; }],
    ['past tense', x => { x.entry.sourceLocator.antipassiveDrinkingProof.composition.tense = 'past'; }],
    ['arbitrary stem', x => { x.entry.sourceLocator.antipassiveDrinkingProof.composition.selectedDependentComponent = 'oni'; }],
    ['specific object inserted', x => { x.entry.sourceLocator.antipassiveDrinkingProof.composition.specificObjectPrefix = 'ki'; }],
    ['source POS silently reclassified', x => { x.entry.sourceLocator.antipassiveDrinkingProof.lexicalScope.printedPos = 'intransitive'; }],
    ['historical frame promoted', x => { x.entry.sourceLocator.antipassiveDrinkingProof.modernComponentEvidence.independentlyAttestedModernFreeNiquiFrameClaimed = true; }],
    ['Tzocohuite lexeme invented', x => { x.entry.sourceLocator.antipassiveDrinkingProof.mechanismEvidence.independentlyAttestedTzocohuiteTlaiLexemeClaimed = true; }],
    ['direct whole attestation invented', x => { x.entry.sourceLocator.antipassiveDrinkingProof.directWholeFormAttestationClaimed = true; }],
    ['generic generator', x => { x.entry.sourceLocator.antipassiveDrinkingProof.generalAntipassiveGeneratorApproved = true; }],
    ['unqualified variety', x => { x.entry.sourceLocator.antipassiveDrinkingProof.qualifiedMixedSourceReference = false; }],
    ['audio association', x => { Object.assign(x.entry, { audioUrl: '/invented.mp3', audioKind: 'source' }); }],
    ['missing lexical alcohol evidence', x => { x.hidalgo.pages[0].text = 'tlai. vb. t.'; }],
    ['source POS contradiction removed', x => { x.hidalgo.pages[0].text = 'tlai. vb. intr. bebida alcohólica'; }],
    ['wrong modern component', x => { x.dictionary.pages[0].text = 'ĀTLĪ. tlach1. ni. achi. ĀTL, O3.'; }],
    ['missing dependency restriction', x => { x.dictionary.pages[1].text = 'Ī3. tlach1. [Mc. 22r]'; }],
    ['historical citation erased', x => { x.dictionary.pages[1].text = x.dictionary.pages[1].text.replace('[Mc. 22r]', ''); }],
    ['generic unrelated rule', x => { x.mechanism.pages[1].text = 'noun incorporation'; }],
    ['wrong language scope', x => { x.mechanism.pages[0].text = 'Tzocohuite [nci]'; }],
    ['wrong person rule', x => { x.course.lessons[0].sections[1].body[1] = 'ti – (verbal base) – ø'; }],
    ['bad source PDF', x => { x.dictionary.source_sha256 = 'wrong'; }],
    ['dictionary URL substituted', x => { x.dictionary.reference_url = 'https://example.org'; }],
    ['bad source URL', x => { x.mechanism.reference_url = 'https://example.org'; }],
    ['peer proof replaced', x => { x.entry.sourceLocator.antipassiveDrinkingProof.peerReviewSha256 = 'unreviewed'; }]
  ];
  it.each(cases)('rejects %s', (_label, change) => { const x = fixture(); change(x); expect(() => verify(x)).toThrow(); });
});
