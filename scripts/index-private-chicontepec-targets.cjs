// Retrieval leads only. No source definitions or examples enter app exports.
const fs = require('node:fs');
const path = require('node:path');
const { toInaliOrthography } = require('../public/nahuatl-orthography.js');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'data/research/yan-garcia-nhe-20261004/verification');
const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const key = value => toInaliOrthography(value.normalize('NFKC')).toLowerCase().trim();
const displayKey = value => value.normalize('NFC').toLowerCase().replace(/[¿¡?!.,:;“”"'/]/g, '').replace(/\s+/g, ' ').trim();
const reference = read('further-sources/chicontepec-pages-private.json');
const publicForms = new Set(JSON.parse(fs.readFileSync(path.join(root, 'src/data/v3-verified-lexicon.json'), 'utf8')).entries.map(entry => displayKey(entry.display)));
const headIndex = new Map();
for (const page of reference.pages) {
  for (const match of page.text.matchAll(/^([A-ZĀĒĪŌ]+[1-9]?)\.\s+(piltlah\.|pil\.|tlaten\.|tlamotz\.|tlat\.|tlap\.|tlach\d?\.)/gm)) {
    const sourceHead = match[1], retrievalKey = key(sourceHead.replace(/\d+$/, ''));
    const leads = headIndex.get(retrievalKey) ?? [];
    leads.push({ source_head: sourceHead, pdf_page: page.pdf_page,
      source_pos_annotation: match[2], character_offset: match.index,
      status: 'exact-head-retrieval-only-not-sense-or-standalone-form-approval' });
    headIndex.set(retrievalKey, leads);
  }
}
const rows = read('coerll-concordance-private.json').forms.filter(form => !form.current_app_candidates.length).map(form => ({
  source_form_key: form.source_form_key, target_key: form.inali_retrieval_key,
  currently_present: publicForms.has(displayKey(form.inali_retrieval_key)),
  private_target_meanings: form.private_book_evidence.map(row => row.source_meaning),
  exact_dictionary_head_leads: headIndex.get(key(form.inali_retrieval_key)) ?? [],
}));
const missing = rows.filter(row => !row.currently_present);
const payload = { schema_version: 1, privacy: 'private-research-only', source_url: reference.reference_url,
  source_sha256: reference.source_sha256,
  method: 'Exact INALI head retrieval. Homograph numbers retained in references; historical root labels, morphology, community and meanings require individual checks. Nothing approved or imported automatically.',
  counts: { indexed_heads: [...headIndex.values()].flat().length, distinct_retrieval_keys: headIndex.size,
    original_new_target_items: rows.length, absent_target_items: missing.length,
    absent_with_head_leads: missing.filter(row => row.exact_dictionary_head_leads.length).length,
    absent_without_head_leads: missing.filter(row => !row.exact_dictionary_head_leads.length).length,
    automatically_approved: 0 }, rows };
fs.writeFileSync(path.join(folder, 'further-sources/chicontepec-target-concordance-private.json'), JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify(payload.counts, null, 2));
