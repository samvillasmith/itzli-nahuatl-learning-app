import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const { verifyLocalReferenceFact, LOCAL_URL, LOCAL_SHA, PASSAGE_SHA } = createRequire(import.meta.url)('../scripts/lib/local-reference-fact.js');

function fixture() {
  // A structural test fixture; production supplies the actual raw-file hash.
  const text = ' '.repeat(8656) + '<h3>Toponimia</h3>' + ' '.repeat(53) + 'tosan "\u0080\u009ctuza o topo"\u0080\u009d';
  const proof = { kind: 'exact-anonymous-municipal-etymology', referenceUrl: LOCAL_URL,
    referenceFileSha256: LOCAL_SHA, headingTextStart: 8656, referenceTextStart: 8727, referenceTextEnd: 8750,
    exactPassageSha256: PASSAGE_SHA, selectedForm: 'tosan', selectedMeaning: 'gopher', scope: 'place-name-lexical-reference',
    completeStandaloneSpokenWordClaimed: false, independentEasternSpeakerCertificationClaimed: false };
  return { reference: { reference_url: LOCAL_URL, source_sha256: LOCAL_SHA, text }, entry: {
    id: 'local-fact', display: 'tosan', sourceSpelling: 'tosan', formKind: 'place-name-lexical-reference', sourceUrl: LOCAL_URL,
    audioUrl: null as string | null, audioKind: 'missing', sourceLocator: { sourceType: 'individual-local-reference-fact',
      sourceUrl: LOCAL_URL, attestedHeadword: 'tosan', localReferenceProof: proof } } };
}
describe('bounded anonymous municipal fact locator', () => {
  it('accepts only the exact source passage with place-name use restrictions', () => {
    const f = fixture(); expect(verifyLocalReferenceFact(f.entry, f.reference, LOCAL_SHA)).toBe(true);
  });
  it('rejects unreviewed, account, query and fragment endpoints', () => {
    for (const url of ['https://example.org/nomenclatura', 'https://drive.google.com/file/d/example', `${LOCAL_URL}?token=example`, `${LOCAL_URL}#account`]) {
      const f = fixture(); f.entry.sourceUrl = url;
      expect(() => verifyLocalReferenceFact(f.entry, f.reference, LOCAL_SHA)).toThrow();
    }
  });
  it('rejects a changed raw source hash or passage text', () => {
    const f = fixture(); expect(() => verifyLocalReferenceFact(f.entry, f.reference, 'b'.repeat(64))).toThrow();
    f.reference.text = f.reference.text.replace('tuza o topo', 'another meaning');
    expect(() => verifyLocalReferenceFact(f.entry, f.reference, LOCAL_SHA)).toThrow('Missing exact municipal');
  });
  it('rejects a changed locator, source form and neighboring section', () => {
    for (const mutate of [
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.localReferenceProof.referenceTextStart++; },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceSpelling = 'tosa'; },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.attestedHeadword = 'tozah'; },
      (f: ReturnType<typeof fixture>) => { f.reference.text = f.reference.text.slice(0, 8674) + '<h3>Other</h3>' + f.reference.text.slice(8688); },
    ]) { const f = fixture(); mutate(f); expect(() => verifyLocalReferenceFact(f.entry, f.reference, LOCAL_SHA)).toThrow(); }
  });
  it('rejects claims of a standalone utterance, speaker certification or borrowed audio', () => {
    for (const mutate of [
      (f: ReturnType<typeof fixture>) => { f.entry.formKind = 'lexical-headword'; },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.localReferenceProof.completeStandaloneSpokenWordClaimed = true; },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.localReferenceProof.independentEasternSpeakerCertificationClaimed = true; },
      (f: ReturnType<typeof fixture>) => { f.entry.audioUrl = 'https://example.org/borrowed.mp3'; },
    ]) { const f = fixture(); mutate(f); expect(() => verifyLocalReferenceFact(f.entry, f.reference, LOCAL_SHA)).toThrow(); }
  });
});
