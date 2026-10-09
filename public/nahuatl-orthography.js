/* Shared by the app bundle and standalone offline practice.
 * INALI's published Nahuatl alphabet governs learner display.
 * Original source text and recording inputs remain separate evidence.
 */
(function (root, factory) {
  const orthography = factory();
  if (typeof module === 'object' && module.exports) module.exports = orthography;
  else root.ItzliOrthography = orthography;
})(globalThis, function () {
  function stripDiacritics(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function matchCase(source, replacement) {
    if (source === source.toUpperCase()) return replacement.toUpperCase();
    if (source[0] === source[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
    return replacement;
  }
  function replaceWithCase(value, pattern, replacement) {
    return value.replace(pattern, (match) => matchCase(match, replacement));
  }
  function toInaliOrthography(value) {
    let out = stripDiacritics(value);
    // Existing reviewed lexical/display choices, rather than generic alphabet rules.
    out = replaceWithCase(out, /\bqueniuhqui\b/gi, 'kenihki');
    out = replaceWithCase(out, /\bkeniuhki\b/gi, 'kenihki');
    out = replaceWithCase(out, /\baxcanah\b/gi, 'axkana');
    // Individually reviewed older Hidalgo spelling of the concessive particle.
    out = replaceWithCase(out, /\bmaskej\b/gi, 'maskeh');
    // Individually reviewed numeral in the older Huasteca SEP spelling.
    out = replaceWithCase(out, /\bexpouali\b/gi, 'expowalli');
    // One reviewed complete ripening/cooking entry; derived forms stay separate.
    out = replaceWithCase(out, /\biucci\b/gi, 'iwksi');
    // Separately reviewed complete form in the licensed cooking narrative.
    out = replaceWithCase(out, /\biuccicca\b/gi, 'iwksikka');
    // Individually reviewed regional day-after-tomorrow entry; no generic u rule.
    out = replaceWithCase(out, /\buiptla\b/gi, 'wiptla');
    // One reviewed divine-title spelling; no general uc-to-wkk substitution.
    out = replaceWithCase(out, /\btoteucco\b/gi, 'totewkko');
    // One reviewed older regional kinship spelling; no generic u or j conversion.
    out = replaceWithCase(out, /\bueltiuj\b/gi, 'weltiw');
    out = replaceWithCase(out, /tz/gi, 'ts');
    out = replaceWithCase(out, /z/gi, 's');
    out = replaceWithCase(out, /cu(?=[aeio])/gi, 'kw');
    out = replaceWithCase(out, /ku(?=[aeio])/gi, 'kw');
    out = replaceWithCase(out, /uc(?=\b|[^aeiou])/gi, 'kw');
    out = replaceWithCase(out, /qu(?=[ei])/gi, 'k');
    out = replaceWithCase(out, /hu(?=[aeio])/gi, 'w');
    out = replaceWithCase(out, /uh(?=\b|[^aeiou])/gi, 'w');
    out = replaceWithCase(out, /c(?=[ei])/gi, 's');
    out = replaceWithCase(out, /c(?!h)/gi, 'k');
    out = replaceWithCase(out, /\bkeniwki\b/gi, 'kenihki');
    return out;
  }
  return { stripDiacritics, toInaliOrthography };
});
