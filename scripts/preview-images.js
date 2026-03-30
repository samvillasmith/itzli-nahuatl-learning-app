/**
 * Generates a self-contained HTML image gallery from word-images.json
 * and opens it in the default browser.
 *
 * Usage: node scripts/preview-images.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/data/word-images.json"), "utf8")
);

const entries = Object.entries(data);
const withImage = entries.filter(([, v]) => v !== null);
const noImage = entries.filter(([, v]) => v === null);

const cards = withImage
  .map(([word, img]) => {
    const pexelsLink = img.pexels_url
      ? `<a href="${img.pexels_url}" target="_blank" class="attr">📷 ${img.author ?? "Pexels"}</a>`
      : `<span class="attr">Pexels</span>`;
    return `
      <div class="card" id="${encodeURIComponent(word)}">
        <div class="img-wrap">
          <img src="${img.url}" alt="${img.alt ?? word}" loading="lazy"
               onerror="this.closest('.card').classList.add('broken')" />
        </div>
        <div class="label">
          <span class="word">${word}</span>
          ${pexelsLink}
        </div>
      </div>`;
  })
  .join("\n");

const missingList = noImage
  .map(([w]) => `<li>${w}</li>`)
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Itzli — Image Gallery (${withImage.length} images)</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #fdf8f0; color: #1e1108; }
  header { padding: 20px 24px; border-bottom: 1px solid #e8d5b5; background: #fff; position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  header h1 { font-size: 1.1rem; font-weight: 700; }
  header p  { font-size: 0.8rem; color: #8b6040; }
  input[type=search] { margin-left: auto; padding: 6px 12px; border: 1px solid #d4b896; border-radius: 8px; font-size: 0.85rem; background: #fdf8f0; width: 200px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; padding: 20px 24px; }
  .card { background: #fff; border: 1px solid #e8d5b5; border-radius: 12px; overflow: hidden; transition: box-shadow .15s; }
  .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }
  .card.broken { opacity: .4; }
  .img-wrap { height: 130px; overflow: hidden; background: #f5e8d5; }
  .img-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .label { padding: 6px 8px; display: flex; flex-direction: column; gap: 2px; }
  .word { font-weight: 700; font-size: 0.88rem; }
  .attr { font-size: 0.68rem; color: #b89270; text-decoration: none; }
  .attr:hover { color: #1a7a62; }
  details { margin: 0 24px 20px; }
  summary { cursor: pointer; font-size: 0.85rem; color: #8b6040; padding: 8px 0; }
  .missing-list { columns: 4; font-size: 0.75rem; color: #b89270; list-style: none; padding: 8px 0; }
  .hidden { display: none !important; }
</style>
</head>
<body>
<header>
  <h1>Itzli Image Gallery</h1>
  <p>${withImage.length} words with images &nbsp;·&nbsp; ${noImage.length} without</p>
  <input type="search" id="search" placeholder="Filter words…" oninput="filterCards(this.value)" />
</header>

<div class="grid" id="grid">
${cards}
</div>

<details>
  <summary>${noImage.length} words without images</summary>
  <ul class="missing-list">
${missingList}
  </ul>
</details>

<script>
function filterCards(q) {
  const term = q.toLowerCase();
  document.querySelectorAll('.card').forEach(card => {
    const word = card.querySelector('.word').textContent.toLowerCase();
    card.classList.toggle('hidden', term.length > 0 && !word.includes(term));
  });
}
</script>
</body>
</html>`;

const outPath = path.join(__dirname, "../image-gallery.html");
fs.writeFileSync(outPath, html, "utf8");
console.log(`Generated: ${outPath}`);
console.log(`  ${withImage.length} images · ${noImage.length} missing`);

// Open in browser
try {
  execSync(`start "" "${outPath}"`);
} catch {
  console.log("Open this file in your browser:", outPath);
}
