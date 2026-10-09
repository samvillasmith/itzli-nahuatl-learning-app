import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const { verifyEhnPublicCorpusFact, verifyExactCorpusOccurrence, FACTS, COPYRIGHT_URL, COPYRIGHT_SHA } = createRequire(import.meta.url)('../scripts/lib/ehn-public-corpus-fact.js');
const privateSourceDirectory = path.resolve('data/research/yan-garcia-nhe-20261004/verification/further-sources');
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const privateSourcesPresent = Object.values(FACTS).every((f) => existsSync(path.join(privateSourceDirectory, (f as { file: string }).file))) && existsSync(path.join(privateSourceDirectory, 'ehn-wycliffe-copyright-public.raw.html'));
const sourceText = (file: string) => existsSync(path.join(privateSourceDirectory, file)) ? readFileSync(path.join(privateSourceDirectory, file), 'utf8') : '';
const occurrence = (s: Record<string, string | number>) => ({ contextVerseId: s.fragment, contextTextStart: s.contextStart, contextTextEnd: s.contextEnd, contextSha256: s.contextSha256, referenceTextStart: s.textStart, referenceTextEnd: Number(s.textStart) + 6 });

function fixture(form = 'nopona') {
  const s = FACTS[form];
  const proof = { kind: 'individually-reviewed-ehn-translation-corpus-function', referenceUrl: s.url, referenceFileSha256: s.sha256,
    selectedForm: form, selectedSense: s.selectedSense, scope: 'translation-corpus-function-reference', ...occurrence(s),
    supplementalOccurrences: s.supplemental ? [occurrence(s.supplemental)] : [], regionalCopyrightUrl: COPYRIGHT_URL, regionalCopyrightSha256: COPYRIGHT_SHA,
    completeStandaloneUtteranceClaimed: false, nearListenerDistanceRuleClaimed: false, generalMorphologyRuleClaimed: false, verseTextReused: false, mediaReuseLicenseClaimed: false };
  return { entry: { display: form, sourceSpelling: form, sourceUrl: `${s.url}#${s.fragment}`, meaningEn: s.meaningEn, meaningEs: s.meaningEs,
    formKind: s.formKind, audioUrl: null as string | null, audioKind: 'missing', sourceLocator: { sourceType: 'individual-ehn-corpus-fact',
      sourceUrl: `${s.url}#${s.fragment}`, attestedHeadword: form, referenceFileSha256: s.sha256, corpusFactProof: proof } },
    reference: { reference_url: s.url, source_sha256: s.sha256, text: sourceText(s.file) }, rawHash: s.sha256,
    copyrightReference: { reference_url: COPYRIGHT_URL, source_sha256: COPYRIGHT_SHA, text: sourceText('ehn-wycliffe-copyright-public.raw.html') } };
}
const check = (f: ReturnType<typeof fixture>) => verifyEhnPublicCorpusFact(f.entry, f.reference, f.rawHash, f.copyrightReference, COPYRIGHT_SHA);

describe('two individually reviewed Eastern Huasteca corpus facts', () => {
  // Protected source chapter text stays in ignored private research. These
  // local positive checks require that evidence; no verse fixture is shipped.
  it.runIf(privateSourcesPresent).each(['nopona', 'ipampa'])('accepts the independently pinned exact source context for %s', (form) => {
    expect(check(fixture(form))).toBe(true);
  });
  it('rejects unreviewed endpoints, account/query parameters and another verse', () => {
    for (const url of ['https://drive.google.com/example', `${FACTS.nopona.url}?token=example#V5`, `${FACTS.nopona.url}#V6`, 'https://ebible.org/nchNT/TIT01.htm#V5']) {
      const f = fixture(); f.entry.sourceUrl = url; expect(() => check(f)).toThrow();
    }
  });
  it('rejects an unreviewed word, including an inherited property name', () => {
    for (const form of ['elsewhere', 'toString']) {
      const f = fixture(); f.entry.sourceSpelling = form; expect(() => check(f)).toThrow('Unreviewed EHN corpus fact');
    }
  });
  it('rejects source/hash interchange and caller claims without the exact source bytes', () => {
    const f = fixture(); f.rawHash = FACTS.ipampa.sha256; expect(() => check(f)).toThrow();
    const changed = fixture(); changed.reference.text += 'changed'; expect(() => check(changed)).toThrow('Changed raw EHN source text');
  });
  it('rejects a broader meaning, free utterance, listener-distance rule or morphology generator', () => {
    for (const mutate of [
      (f: ReturnType<typeof fixture>) => { f.entry.meaningEn = 'always next to you'; },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.corpusFactProof.completeStandaloneUtteranceClaimed = true; },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.corpusFactProof.nearListenerDistanceRuleClaimed = true; },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.corpusFactProof.generalMorphologyRuleClaimed = true; },
    ]) { const f = fixture(); mutate(f); expect(() => check(f)).toThrow(); }
  });
  it('rejects copied verse, granted media or a borrowed recording claim', () => {
    for (const mutate of [
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.corpusFactProof.verseTextReused = true; },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.corpusFactProof.mediaReuseLicenseClaimed = true; },
      (f: ReturnType<typeof fixture>) => { f.entry.audioUrl = 'https://example.org/borrowed.mp3'; },
    ]) { const f = fixture(); mutate(f); expect(() => check(f)).toThrow(); }
  });
  it.runIf(privateSourcesPresent)('requires the pinned original regional/copyright provenance', () => {
    const f = fixture(); f.copyrightReference.text = 'Another dialect with an open license'; expect(() => check(f)).toThrow();
    const redirected = fixture(); redirected.copyrightReference.reference_url = 'https://example.org/license'; expect(() => check(redirected)).toThrow();
  });
  it.runIf(privateSourcesPresent)('requires the second source context for the beneficiary use', () => {
    const f = fixture('ipampa'); f.entry.sourceLocator.corpusFactProof.supplementalOccurrences = []; expect(() => check(f)).toThrow();
  });
});

describe('exact whole-token and source-context boundaries', () => {
  function ownFixture(token = 'there') {
    const context = `<span class="verse" id="V1">1</span>${token}. `;
    const text = context + '<span class="verse" id="V2">2</span>Elsewhere.';
    const spec = { fragment: 'V1', contextStart: 0, contextEnd: context.length, contextSha256: sha(context), textStart: context.indexOf(token), nextVerse: 'V2' };
    const proof = { contextVerseId: spec.fragment, contextTextStart: spec.contextStart, contextTextEnd: spec.contextEnd, contextSha256: spec.contextSha256, referenceTextStart: spec.textStart, referenceTextEnd: spec.textStart + token.length };
    return { text, spec, proof };
  }
  it('accepts a full token inside the individually identified context', () => {
    const f = ownFixture(); expect(() => verifyExactCorpusOccurrence(f.text, 'there', f.proof, f.spec)).not.toThrow();
  });
  it('rejects partial words despite matching a token prefix', () => {
    const f = ownFixture('thereabouts'); f.proof.referenceTextEnd = f.proof.referenceTextStart + 5;
    expect(() => verifyExactCorpusOccurrence(f.text, 'there', f.proof, f.spec)).toThrow('substring');
  });
  it('rejects a moved offset or an unchanged hash claim over changed context', () => {
    const moved = ownFixture(); moved.proof.referenceTextStart++; expect(() => verifyExactCorpusOccurrence(moved.text, 'there', moved.proof, moved.spec)).toThrow();
    const changed = ownFixture(); changed.text = changed.text.replace('there.', 'other.'); expect(() => verifyExactCorpusOccurrence(changed.text, 'there', changed.proof, changed.spec)).toThrow('Changed selected EHN context');
  });
  it('rejects a neighboring verse even when the selected context remains intact', () => {
    const f = ownFixture(); f.text = f.text.replace('id="V2"', 'id="V3"'); expect(() => verifyExactCorpusOccurrence(f.text, 'there', f.proof, f.spec)).toThrow();
  });
});
