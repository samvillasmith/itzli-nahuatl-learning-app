const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const audit = JSON.parse(fs.readFileSync('data/media-audit/missing-cards-current.private.json', 'utf8'));
const pending = JSON.parse(fs.readFileSync('data/openai-word-images-pending.json', 'utf8'));
const published = JSON.parse(fs.readFileSync('data/media-audit/restored-card-published-urls.private.json', 'utf8'));
const folder = 'data/image-review-v3';
const rows = audit.explicitWholeFormLinks.filter(row => row.eligibleImage === true)
  .sort((a, b) => a.unit - b.unit || a.display.localeCompare(b.display));
if (rows.length !== 45 || new Set(rows.map(row => row.entryId)).size !== 43) throw new Error('Unexpected placement inventory');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const cards = rows.map((row, i) => {
  const image = pending[row.entryId];
  let url = published[row.entryId];
  if (image) {
    const filename = path.basename(image.local_path);
    const bytes = fs.readFileSync(path.join(folder, filename));
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== image.image_sha256) throw new Error(`Image mismatch: ${row.entryId}`);
    url = encodeURIComponent(filename);
  }
  if (!url) throw new Error(`Missing exact asset: ${row.entryId}`);
  return `<article class="card" data-search="${escape(`${row.display} ${row.meaningEn} ${row.meaningEs} ${row.unit}`.toLowerCase())}">
    <div class="card-top"><span>${String(i + 1).padStart(2, '0')}</span><a href="http://127.0.0.1:3000/en/units/${row.unit}" target="_blank" rel="noopener">Lesson ${row.unit} ↗</a></div>
    <a class="art" href="${escape(url)}" target="_blank" rel="noopener" aria-label="Enlarge ${escape(row.display)}"><img src="${escape(url)}" alt="${escape(`${row.display} — ${row.meaningEn}`)}" decoding="async"></a>
    <div class="caption"><h2>${escape(row.display)}</h2><p>${escape(row.meaningEn)}</p><p class="spanish" lang="es">${escape(row.meaningEs)}</p><a class="source" href="${escape(row.sourceUrl)}" target="_blank" rel="noopener">Vocabulary source ↗</a></div>
  </article>`;
}).join('\n');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Itzli · 45 restored card images</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f6f2e8;color:#30271e;font:16px/1.5 system-ui,sans-serif}header{max-width:1440px;margin:auto;padding:42px 28px 20px}.eyebrow{color:#696344;font-size:13px;letter-spacing:.15em;font-weight:700;text-transform:uppercase}h1{font-size:clamp(28px,4vw,46px);letter-spacing:-.04em;line-height:1.13;margin:10px 0 15px}header p{max-width:780px;margin:8px 0;color:#685b4c}.toolbar{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:25px}input{font:inherit;width:min(440px,100%);padding:12px 16px;border:1px solid #d3c8b4;border-radius:10px;background:#fffdf7;color:inherit}#count,#loaded{font-size:14px;color:#696344}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:20px;max-width:1440px;margin:auto;padding:10px 28px 48px}.card{background:#fffdf8;border:1px solid #e0d5c3;border-radius:15px;overflow:hidden;box-shadow:0 3px 10px #39230a08;min-width:0}.card[hidden]{display:none}.card-top{display:flex;justify-content:space-between;padding:12px 16px;font-size:12px;color:#76634d}.card-top span{font-variant-numeric:tabular-nums;font-weight:700}a{color:#53693c;text-underline-offset:3px}.card-top a,.source{text-decoration:none}.art{display:block;background:#fbf1d8;aspect-ratio:1;position:relative}.art img{display:block;width:100%;height:100%;object-fit:contain}.caption{padding:18px 18px 20px}.caption h2{font-size:20px;margin:0 0 5px;overflow-wrap:anywhere}.caption p{margin:4px 0}.spanish{font-size:14px;color:#796b59}.source{font-size:12px;display:inline-block;margin-top:12px}.failed{padding:25px;display:flex;align-items:center;justify-content:center;text-align:center;color:#965537}@media(min-width:1200px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:550px){header{padding:28px 18px 15px}.grid{padding:8px 18px 32px;grid-template-columns:1fr}h1{font-size:32px}}
</style></head><body><header><div class="eyebrow">Itzli · Version 3.0 · Image review</div><h1>The 45 restored card images</h1><p>43 distinct illustrations across 45 lesson placements. Clothing and “in two places” each appear in two lessons. These are the existing images restored to the cards.</p><p>Click any image to view it at full size.</p><div class="toolbar"><input id="search" type="search" placeholder="Search words, meanings, or lesson numbers" aria-label="Search restored cards"><span id="count">45 of 45 cards</span><span id="loaded" aria-live="polite">Loading images…</span></div></header><main class="grid">${cards}</main>
<script>
const cards=[...document.querySelectorAll('.card')],images=[...document.querySelectorAll('img')],status=document.getElementById('loaded');
function update(){const done=images.filter(image=>image.complete&&image.naturalWidth>0).length;status.textContent=done+' of 45 images loaded'}
for(const image of images){image.addEventListener('load',update);image.addEventListener('error',()=>{const note=document.createElement('span');note.className='failed';note.textContent='Image could not load. Click to open the original.';image.replaceWith(note);update()})}update();
document.getElementById('search').addEventListener('input',event=>{const query=event.target.value.trim().toLowerCase();let count=0;for(const card of cards){card.hidden=!card.dataset.search.includes(query);if(!card.hidden)count++}document.getElementById('count').textContent=count+' of 45 cards'});
</script></body></html>`;
fs.writeFileSync(path.join(folder, 'restored-cards.html'), html);
console.log(JSON.stringify({ gallery: path.resolve(folder, 'restored-cards.html'), placements: rows.length, distinctImages: new Set(rows.map(row => row.entryId)).size }));
