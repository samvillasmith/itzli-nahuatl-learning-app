const assert = require('node:assert/strict');

const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Validate a private reference locator without exporting its example sentence.
 * This checks provenance and the exact written form; the frozen semantic review
 * separately checks modern usage, person, arguments, tense and intended sense. */
function verifyReferenceFactLocator(entry, referencePages, referenceFileHash, normalize) {
  const loc = entry.sourceLocator;
  assert.ok(referencePages, 'Private reference required for PDF locators');
  const url = new URL(entry.sourceUrl);
  assert.equal(url.origin + url.pathname, referencePages.reference_url);
  assert.equal(url.search, '');
  assert.equal(url.hash, `#page=${loc.referencePdfPage}`);
  assert.equal(loc.referenceFileSha256, referencePages.source_sha256);
  assert.equal(referenceFileHash, referencePages.source_sha256);
  const validPage = page => Number.isInteger(page) && page >= 16 && page <= referencePages.pages.length;
  assert.ok(validPage(loc.referencePdfPage), 'Invalid reference body page');
  if (loc.sourceType === 'individual-reference-alias') {
    const proof = loc.referenceAliasEvidence;
    assert.equal(proof.kind, 'explicit-headword-redirect');
    assert.equal(proof.aliasHeadword, loc.referenceHeadword);
    assert.equal(proof.aliasPdfPage, loc.referencePdfPage);
    assert.equal(proof.canonicalHeadword, loc.referenceCanonicalHeadword);
    assert.equal(proof.canonicalPdfPage, loc.referenceCanonicalHeadwordPdfPage);
    assert.notEqual(proof.aliasHeadword, proof.canonicalHeadword);
    assert.ok(validPage(proof.canonicalPdfPage), 'Invalid canonical reference page');
    assert.equal(entry.sourceSpelling, proof.aliasHeadword.toLowerCase());
    assert.equal(entry.formKind, 'lexical-headword');
    assert.equal(entry.audioUrl, null);
    const redirect = `${proof.aliasHeadword}. Xiquitta ${proof.canonicalHeadword}.`;
    assert.equal(proof.exactPrintedRedirect, redirect);
    const aliasPage = referencePages.pages[proof.aliasPdfPage - 1].text;
    const redirectPattern = redirect.split(/\s+/).map(escapePattern).join('\\s+');
    assert.ok(new RegExp(`^${redirectPattern}(?=\\s|$)`, 'm').test(aliasPage), 'Missing exact printed headword redirect');
    const canonicalPage = referencePages.pages[proof.canonicalPdfPage - 1].text;
    const head = new RegExp(`^${escapePattern(proof.canonicalHeadword)}\\.\\s+tlach(?:[1-9](?:/[1-9])?)?\\.`, 'm').exec(canonicalPage);
    assert.ok(head, 'Missing exact canonical verb head');
    const rest = canonicalPage.slice(head.index + head[0].length);
    const next = rest.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|tlaten\.|pil\.|tlach(?:\d(?:\/\d)?)?\.|Xiquitta\b)/mu);
    const definition = rest.slice(0, next < 0 ? undefined : next).trim();
    let selected = definition;
    if (proof.canonicalSelectedSense === 'unnumbered modern head') {
      assert.ok(!/(?:^|\s)[1-9]\.\s/u.test(definition), 'Canonical sense is numbered');
    } else {
      assert.match(proof.canonicalSelectedSense, /^[1-9]\d*$/u);
      const marker = new RegExp(`(?:^|\\s)${proof.canonicalSelectedSense}\\.\\s`, 'u').exec(definition);
      assert.ok(marker, 'Missing selected canonical sense');
      const senseRest = definition.slice(marker.index + marker[0].length);
      const nextSense = senseRest.search(/(?:^|\s)[1-9]\d*\.\s/u);
      selected = senseRest.slice(0, nextSense < 0 ? undefined : nextSense).trim();
    }
    assert.ok(['ni', 'nimo'].includes(proof.canonicalFrame), 'Unsupported canonical argument frame');
    assert.ok(selected.startsWith(`${proof.canonicalFrame}. `), 'Selected canonical sense has no reviewed frame');
    assert.ok(!selected.startsWith(`${proof.canonicalFrame}. axcanah`), 'Canonical entry is a dependent reference');
    return;
  }
  const isAttestedForm = loc.sourceType === 'individual-reference-form';
  const headPage = isAttestedForm ? loc.referenceHeadwordPdfPage : loc.referencePdfPage;
  assert.ok(validPage(headPage), 'Invalid reference head page');
  const headText = referencePages.pages[headPage - 1].text;
  const headPattern = new RegExp(`^${escapePattern(loc.referenceHeadword)}\\.\\s+(?:tlat\\.|tlap\\.|tlaten\\.|pil\\.|tlach(?:\\d(?:/\\d)?)?\\.)`, 'm');
  const headMatch = headPattern.exec(headText);
  assert.ok(headMatch, `Missing exact reference head ${entry.id}`);
  if (!isAttestedForm) {
    assert.equal(normalize(entry.sourceSpelling), normalize(loc.referenceHeadword.replace(/[1-9]$/, '')));
    return;
  }
  const body = referencePages.pages[loc.referencePdfPage - 1].text;
  assert.ok(Number.isInteger(loc.referenceTextStart) && loc.referenceTextStart >= 0 && loc.referenceTextStart < body.length,
    'Invalid exact form offset');
  assert.ok(loc.referencePdfPage >= headPage, 'Reference body precedes its governing head');
  const entryBeforeForm = referencePages.pages.slice(headPage - 1, loc.referencePdfPage)
    .map((page, index, span) => page.text.slice(index === 0 ? headMatch.index : 0,
      index === span.length - 1 ? loc.referenceTextStart : undefined)).join('\n');
  // Do not let a valid token in an unrelated neighboring definition borrow the
  // chosen head's identity. Page running headers have no POS/alias marker.
  const nextHead = /^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|tlaten\.|pil\.|tlach(?:\d(?:\/\d)?)?\.|Xiquitta\b)/mu;
  assert.ok(!nextHead.test(entryBeforeForm.slice(headMatch[0].length)),
    'Reference form belongs to a different governing entry');
  assert.ok(entry.sourceSpelling.trim(), 'Empty attested form');
  const pattern = entry.sourceSpelling.trim().split(/\s+/).map(escapePattern).join('\\s+');
  const match = new RegExp(`^${pattern}`, 'u').exec(body.slice(loc.referenceTextStart));
  assert.ok(match, `Unattested exact reference form ${entry.id}`);
  const before = body.slice(0, loc.referenceTextStart).slice(-1);
  const after = body.slice(loc.referenceTextStart + match[0].length, loc.referenceTextStart + match[0].length + 1);
  assert.ok(!/[\p{L}\p{M}]/u.test(before) && !/[\p{L}\p{M}]/u.test(after), 'Reference form is only part of a larger word');
  assert.equal(match[0].replace(/\s+/g, ' ').trim(), entry.sourceSpelling.replace(/\s+/g, ' ').trim());
}

module.exports = { verifyReferenceFactLocator };
