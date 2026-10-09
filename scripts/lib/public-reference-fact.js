const assert = require('node:assert/strict');
const SEP_URL = 'https://dgeiib.basica.sep.gob.mx/files/fondo-editorial/educacion-intercultural/cgeib_00028.pdf';
const SEP_SHA = 'c25887473619870cd9dd7e2a2ce1f63ae73e82ef8e554940e02cd4be95511166';
const HIDALGO_URL = 'https://dgeiib.basica.sep.gob.mx/files/fondo-editorial/materiales-apoyo-didactico/mad_00049.pdf';
const HIDALGO_SHA = 'c5f6de7e12a2e3d505f03a66e3db83a26c7c3c8a564eb6dd8e73c2f597e4febf';
const MULTISTATE_URL = 'https://dgeiib.basica.sep.gob.mx/files/fondo-editorial/asignaturas-lengua-indigena/ali_00018.pdf';
const MULTISTATE_SHA = '0754cb3948eaac35c5d46d9cdc0a141c3a12e413837f4946f67968604dac4e71';
const PUEBLA_URL = 'https://www.huastecamexico.com/data/ediciones/diccionario_biligue_nahuatl_esp.pdf';
const PUEBLA_SHA = 'ee7492f033ec5487978e1459b0aad6fa49ab187d060b2d90bcbf3b0f6019312b';
const INE_URL = 'https://ine.mx/wp-content/uploads/2024/08/Deceyec-el_tejido_de_nuestras_voces.pdf';
const INE_SHA = '8a18deb6de8e7e0022ee5494bc10aa1f2ab03fe617aa25d16f96a81fc023e665';
const ZONGOLICA_URL = 'https://xochitlahtolli.wordpress.com/wp-content/uploads/2012/04/diccionario-completo.pdf';
const ZONGOLICA_SHA = 'a46b8ead3187dfcd893c286ba09d756414903f81656b35dcd814352390bdb100';
const AVELI_URL = 'https://www.aveligob.mx/anz/micrositio/IMAGENES/PDF%20POR%20TEMA/13_NUMEROS_ORDINALES.pdf';
const AVELI_SHA = '5b46e28429f80f890b36e59d119ce7305ab6cdb8d0a28ccfbb9c23457a0ce935';
const REFERENCES = new Map([[SEP_URL, SEP_SHA], [HIDALGO_URL, HIDALGO_SHA], [MULTISTATE_URL, MULTISTATE_SHA], [PUEBLA_URL, PUEBLA_SHA], [INE_URL, INE_SHA], [ZONGOLICA_URL, ZONGOLICA_SHA], [AVELI_URL, AVELI_SHA]]);
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Exact passage provenance for the independently reviewed public SEP guide.
// Contextual meaning and regional scope still require the frozen peer review.
function verifyPublicReferenceFact(entry, reference, fileHash) {
  const loc = entry.sourceLocator;
  assert.equal(loc.sourceType, 'individual-public-reference-fact');
  const expectedHash = REFERENCES.get(reference.reference_url);
  assert.ok(expectedHash, 'Unreviewed public publisher reference');
  assert.equal(reference.source_sha256, expectedHash);
  assert.equal(fileHash, expectedHash);
  assert.equal(loc.referenceFileSha256, expectedHash);
  assert.equal(entry.sourceUrl, `${reference.reference_url}#page=${loc.referencePdfPage}`);
  assert.equal(loc.sourceUrl, entry.sourceUrl);
  assert.equal(entry.audioUrl, null);
  assert.equal(loc.attestedHeadword, entry.sourceSpelling);
  assert.ok(Number.isInteger(loc.referencePdfPage) && loc.referencePdfPage >= 1 && loc.referencePdfPage <= reference.pages.length);
  const body = reference.pages[loc.referencePdfPage - 1].text;
  assert.ok(Number.isInteger(loc.referenceTextStart) && loc.referenceTextStart >= 0 && loc.referenceTextStart < body.length);
  assert.ok(entry.sourceSpelling.trim());
  const pattern = entry.sourceSpelling.split(/\s+/).map(escapePattern).join('\\s+');
  const match = new RegExp(`^${pattern}`, 'u').exec(body.slice(loc.referenceTextStart));
  assert.ok(match, 'Missing exact public reference form');
  const before = body.slice(0, loc.referenceTextStart).slice(-1);
  const after = body.slice(loc.referenceTextStart + match[0].length, loc.referenceTextStart + match[0].length + 1);
  assert.ok(!/[\p{L}\p{M}\p{N}_]/u.test(before + after), 'Public reference form is part of a longer token');
}
module.exports = { verifyPublicReferenceFact, SEP_URL, SEP_SHA, HIDALGO_URL, HIDALGO_SHA, MULTISTATE_URL, MULTISTATE_SHA, PUEBLA_URL, PUEBLA_SHA, INE_URL, INE_SHA, ZONGOLICA_URL, ZONGOLICA_SHA, AVELI_URL, AVELI_SHA };
