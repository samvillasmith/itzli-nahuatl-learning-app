const assert = require('node:assert/strict');
const { verifyReferenceFactLocator } = require('./reference-fact-locator');
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function verifyReferenceStemLocator(entry, pages, pdfHash) {
  const loc = entry.sourceLocator, proof = loc.referenceStemEvidence;
  assert.equal(loc.sourceType, 'individual-reference-stem');
  assert.equal(loc.attestedHeadword, null, 'A stem must not claim headword attestation');
  assert.equal(entry.audioUrl, null);
  assert.ok(['bound-stem', 'possessed-stem', 'relational-base'].includes(entry.formKind), 'Stem must be a labeled building block');
  const combining = proof.kind === 'explicit-combining-stem';
  assert.match(loc.referenceStem, combining ? /^\S+-$/u : /^-\S+$/u);
  assert.equal(entry.sourceSpelling, combining ? loc.referenceStem.slice(0, -1) : loc.referenceStem.slice(1));
  if (combining) assert.equal(entry.formKind, 'bound-stem');
  assert.equal(proof.exactPrintedMetadata, loc.referenceStem);
  assert.equal(proof.sourceExplicitStemMetadata, true);
  assert.equal(proof.referenceHeadword, loc.referenceHeadword);
  assert.equal(proof.referencePdfPage, loc.referencePdfPage);
  const fields = { 'explicit-possessed-stem': 'tlaaxca', 'explicit-possessed-plural-stem': 'miaq', 'explicit-combining-stem': 'tlazal' };
  const field = fields[proof.kind];
  assert.ok(field, 'Unsupported source stem field');
  verifyReferenceFactLocator({ ...entry, sourceSpelling: loc.referenceHeadword.replace(/[1-9]$/, ''),
    sourceLocator: { ...loc, sourceType: 'individual-reference-fact' } }, pages, pdfHash, value => value.toLowerCase());
  const text = pages.pages[loc.referencePdfPage - 1].text;
  const start = text.search(new RegExp(`^${escapePattern(loc.referenceHeadword)}\\.\\s+(?:tlat\\.|tlap\\.|tlaten\\.|pil\\.|tlach(?:\\d(?:/\\d)?)?\\.)`, 'm'));
  const rest = text.slice(start + loc.referenceHeadword.length + 1);
  const next = rest.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|tlaten\.|pil\.|tlach(?:\d(?:\/\d)?)?\.|Xiquitta\b)/mu);
  const definition = text.slice(start, next < 0 ? text.length : start + loc.referenceHeadword.length + 1 + next);
  assert.ok(new RegExp(`\\b${field}\\.\\s+${escapePattern(loc.referenceStem)}(?![\\p{L}\\p{M}])`, 'u').test(definition),
    'Stem is not in the governing source metadata');
}
module.exports = { verifyReferenceStemLocator };
