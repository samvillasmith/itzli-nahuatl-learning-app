import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const { verifyWaterDiminutiveReference, WATER_DIMINUTIVE_PROOF, DICTIONARY_SHA, COURSE_SHA, INE_SHA, DICTIONARY_URL, INE_URL } = require('../scripts/lib/water-diminutive-reference.js');
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
function fixture() {
  const body = Array.from({ length: 34 }, () => ''); body[32] = 'Titlapiyaltzin “You are a little domesticated animal”'; body[33] = 'Tlapiyaltzin “She/he is a little domesticated animal”';
  const vocabulary = Array.from({ length: 8 }, () => ''); vocabulary[7] = 'pilātzin “honored water”';
  return {
    entry: { display: 'atsin', sourceSpelling: 'ātzin', meaningEn: 'water (diminutive reference)', meaningEs: 'agua (referencia diminutiva)', partOfSpeech: 'noun reference',
      formKind: 'rule-composed-reference-form', sourceUrl: DICTIONARY_URL + '#page=45', audioUrl: null, audioKind: 'missing', verification: { formEvidence: 'bounded-model-composition' },
      sourceLocator: { sourceType: 'productive-water-diminutive-reference', attestedHeadword: null, referenceFileSha256: DICTIONARY_SHA, referencePdfPage: 45,
        referenceHeadword: 'ĀTL', sourceUrl: DICTIONARY_URL + '#page=45', waterDiminutiveProof: clone(WATER_DIMINUTIVE_PROOF) } },
    dictionary: { source_sha256: DICTIONARY_SHA, reference_url: DICTIONARY_URL, pages: [
      { pdf_page: 45, text: 'ĀTL. tlat.' }, { pdf_page: 46, text: 'tlazal. ā-, āl-.' },
      { pdf_page: 579, text: 'TZIN. tlat. Motequihuia ica tlatzinpepecholli PĪL; tlen cuecuetztzin; pilpiyotzin' }] },
    course: { lessons: [{ number: 20, sections: [{ body: [] }, { body }, { body: vocabulary }] }] },
    ine: { source_sha256: INE_SHA, reference_url: INE_URL, pages: [{ pdf_page: 38, text: ' '.repeat(1089) + 'etsin' }] }
  };
}
type Fixture = ReturnType<typeof fixture>;
const verify = (x: Fixture) => verifyWaterDiminutiveReference(x.entry, x.dictionary, DICTIONARY_SHA, x.course, COURSE_SHA, x.ine, INE_SHA);
describe('one bounded water-diminutive reference', () => {
  it('accepts the exact authored composition with source restrictions retained', () => expect(() => verify(fixture())).not.toThrow());
  const cases: [string, (x: Fixture) => void][] = [
    ['respect certification', x => { x.entry.sourceLocator.waterDiminutiveProof.easternRespectfulWaterUseCertified = true; }],
    ['little-water quantity request', x => { x.entry.sourceLocator.waterDiminutiveProof.quantitativeRequestMeaningClaimed = true; }],
    ['attested Chicontepec word claim', x => { x.entry.sourceLocator.waterDiminutiveProof.directlyAttestedChicontepecBareWaterUseClaimed = true; }],
    ['generic optional pil', x => { x.entry.sourceLocator.waterDiminutiveProof.generalOptionalPilRuleClaimed = true; }],
    ['generic generator', x => { x.entry.sourceLocator.waterDiminutiveProof.generalDiminutiveGeneratorApproved = true; }],
    ['honored sense automatically transferred', x => { x.entry.sourceLocator.waterDiminutiveProof.suffixEvidence.sourceRespectMeaningAutomaticallyApplied = true; }],
    ['stem changed', x => { x.entry.sourceLocator.waterDiminutiveProof.composition.nounBase = 'āl'; }],
    ['possessed stem substituted', x => { x.entry.sourceLocator.waterDiminutiveProof.composition.nounBase = 'āuh'; }],
    ['bottom homograph', x => { x.entry.sourceLocator.waterDiminutiveProof.suffixEvidence.referenceHeadword = 'TZĪN'; }],
    ['plural suffix', x => { x.entry.sourceLocator.waterDiminutiveProof.composition.diminutiveSuffix = 'tzitzin'; }],
    ['subject added', x => { x.entry.sourceLocator.waterDiminutiveProof.composition.subject = { person: 1 }; }],
    ['source quotation pil deleted', x => { x.entry.sourceLocator.waterDiminutiveProof.licensedModels.waterModel.quotedSourceFormModifiedByDeletingPil = true; }],
    ['malformed paradigm cell approved', x => { x.entry.sourceLocator.waterDiminutiveProof.licensedModels.malformedParadigmCellUsed = true; }],
    ['entire paradigm approved', x => { x.entry.sourceLocator.waterDiminutiveProof.licensedModels.entireParadigmApproved = true; }],
    ['bean semantics invented', x => { x.entry.sourceLocator.waterDiminutiveProof.nativeAssociatedBareWord.independentlyProvenDiminutiveSemanticsClaimed = true; }],
    ['unqualified meaning', x => { x.entry.meaningEn = 'honored water'; }],
    ['audio association', x => { Object.assign(x.entry, { audioUrl: '/unheard.mp3', audioKind: 'source' }); }],
    ['modern water stem missing', x => { x.dictionary.pages[1].text = 'tlazal. āuh-.'; }],
    ['regional pil condition removed', x => { x.dictionary.pages[2].text = 'TZIN. tlat. tlen cuecuetztzin; pilpiyotzin'; }],
    ['wrong suffix definition', x => { x.dictionary.pages[2].text = 'TZĪN. tlat. Motequihuia ica tlatzinpepecholli PĪL; tlen cuecuetztzin; pilpiyotzin'; }],
    ['bare singular model altered', x => { x.course.lessons[0].sections[1].body[33] = 'PilTlapiyaltzin'; }],
    ['actual native-associated word absent', x => { x.ine.pages[0].text = ' '.repeat(1089) + 'pilētzīn'; }],
    ['source PDF substituted', x => { x.ine.source_sha256 = 'wrong'; }],
    ['peer replaced', x => { x.entry.sourceLocator.waterDiminutiveProof.peerReviewSha256 = 'unreviewed'; }]
  ];
  it.each(cases)('rejects %s', (_label, change) => { const x = fixture(); change(x); expect(() => verify(x)).toThrow(); });
});
