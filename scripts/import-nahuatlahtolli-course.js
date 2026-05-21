#!/usr/bin/env node

/**
 * Imports public CC-BY-SA Nāhuatlahtolli lesson pages into a local JSON file.
 *
 * The importer intentionally keeps provenance metadata, source URLs, and media
 * links. It does not download or rehost UT/COERLL images, logos, audio, or video.
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = "https://tlahtolli.coerll.utexas.edu";
const POSTS_URL = `${BASE_URL}/wp-json/wp/v2/posts?per_page=100`;
const PAGES_URL = `${BASE_URL}/wp-json/wp/v2/pages?per_page=100`;
const OUT_PATH = path.resolve(__dirname, "..", "src", "data", "nahuatlahtolli-course.json");

const AUTHORS = [
  "Sabina de la Cruz",
  "Catalina de la Cruz",
  "Josefrayn Sánchez-Perry",
  "Kelly McDonough",
  "Sergio Romero",
];

const SUPPORT_PAGES = [
  { slug: "introduction", kind: "introduction" },
  { slug: "the-language", kind: "language" },
  { slug: "resources", kind: "resources" },
  { slug: "grant", kind: "funding" },
  { slug: "the-team", kind: "team" },
];

const BLOCK_MARKER = "@@ITZLI_SECTION@@";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Itzli course importer (CC-BY-SA attribution; contact svillasmith3@gmail.com)",
    },
  });

  if (!res.ok) {
    throw new Error(`${url} returned HTTP ${res.status}`);
  }

  return res.text();
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, "\"")
    .replace(/&#8221;/g, "\"")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(value) {
  return decodeEntities(value)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function stripTags(html) {
  return cleanText(html.replace(/<[^>]+>/g, " "));
}

function getMatch(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1] : "";
}

function absolutizeUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return new URL(url, BASE_URL).toString();
}

function extractEntryHtml(html) {
  const pfStart = html.indexOf('<div class="pf-content">');
  if (pfStart >= 0) {
    const bodyStart = pfStart + '<div class="pf-content">'.length;
    const bodyEnd = html.indexOf("</div><!-- .entry-content -->", bodyStart);
    if (bodyEnd > bodyStart) return html.slice(bodyStart, bodyEnd);
  }

  const entryStart = html.indexOf('<div class="entry-content">');
  if (entryStart >= 0) {
    const bodyStart = entryStart + '<div class="entry-content">'.length;
    const bodyEnd = html.indexOf("</div><!-- .entry-content -->", bodyStart);
    if (bodyEnd > bodyStart) return html.slice(bodyStart, bodyEnd);
  }

  return html;
}

function extractMediaLinks(html) {
  const links = new Set();
  const patterns = [
    /<source[^>]+src=["']([^"']+)["']/gi,
    /<a[^>]+href=["']([^"']+)["']/gi,
    /<img[^>]+src=["']([^"']+)["']/gi,
    /play_mp3\([^)]*?['"](https?:\/\/[^'"]+)['"]/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html))) {
      const url = absolutizeUrl(decodeEntities(match[1]).replace(/\?_=.+$/, ""));
      if (url.includes("/wp-content/uploads/")) links.add(url);
    }
  }

  return [...links].sort().map((url) => {
    const cleanUrl = url.split("?")[0];
    const ext = cleanUrl.split(".").pop()?.toLowerCase() ?? "";
    const type =
      ["mp3", "wav", "m4a", "ogg"].includes(ext) ? "audio" :
      ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? "image" :
      ["mp4", "webm", "mov"].includes(ext) ? "video" :
      "file";

    return { type, url };
  });
}

function htmlToText(html) {
  let text = html;

  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<!--[\s\S]*?-->/g, " ");
  text = text.replace(/<div[^>]+id=["']sm2-container["'][\s\S]*?<\/div>/gi, " ");
  text = text.replace(/<input[^>]*>/gi, " ");
  text = text.replace(/<audio[\s\S]*?<\/audio>/gi, (audioHtml) => {
    const src = getMatch(audioHtml, /<source[^>]+src=["']([^"']+)["']/i) ||
      getMatch(audioHtml, /<a[^>]+href=["']([^"']+)["']/i);
    return src ? `\nAudio: ${decodeEntities(src).replace(/\?_=.+$/, "")}\n` : "\n";
  });
  text = text.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (_, src) => {
    return `\nImage: ${absolutizeUrl(decodeEntities(src))}\n`;
  });
  text = text.replace(/play_mp3\([^)]*?['"](https?:\/\/[^'"]+)['"][^)]*\)/gi, (_, src) => {
    return `\nAudio: ${decodeEntities(src)}\n`;
  });
  text = text.replace(
    /<span class=["']nahuatl["']>([\s\S]*?)<\/span>\s*<span class=["']translation["']>([\s\S]*?)<\/span>/gi,
    (_, nahuatl, translation) => `${BLOCK_MARKER}${stripTags(nahuatl)} - ${stripTags(translation)}\n`
  );
  text = text.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, heading) => {
    return `${BLOCK_MARKER}${stripTags(heading)}\n`;
  });
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(p|li|tr|div|table|ul|ol)>/gi, "\n");
  text = text.replace(/<td[^>]*>/gi, " ");
  text = text.replace(/<th[^>]*>/gi, " ");
  text = text.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
    const labelText = stripTags(label);
    const url = absolutizeUrl(decodeEntities(href));
    if (!labelText || labelText === url) return url;
    return `${labelText} (${url})`;
  });
  text = text.replace(/<[^>]+>/g, " ");

  return cleanText(text);
}

function splitSections(text) {
  const sections = [];
  const hasSectionMarkers = text.includes(BLOCK_MARKER);
  const parts = text.split(BLOCK_MARKER);

  for (const part of parts) {
    const lines = part
      .split("\n")
      .map((line) => cleanText(line))
      .filter(Boolean)
      .filter((line) => !/^Show\/Hide (English|Spanish) translation$/i.test(line))
      .filter((line) => !/^Mostrar\/Ocultar traducci/i.test(line));

    if (lines.length === 0) continue;

    if (!hasSectionMarkers) {
      sections.push({ heading: "Overview", body: lines });
      continue;
    }

    const [heading, ...body] = lines;
    sections.push({ heading, body });
  }

  return sections.filter((section) => section.heading || section.body.length > 0);
}

function extractVocabulary(html) {
  const items = [];
  const paragraphs = html.match(/<p[\s\S]*?<\/p>/gi) ?? [];

  for (const paragraph of paragraphs) {
    const audio = getMatch(paragraph, /play_mp3\([^)]*?['"](https?:\/\/[^'"]+)['"]/i) ||
      getMatch(paragraph, /<source[^>]+src=["']([^"']+)["']/i);
    if (!audio) continue;
    const text = stripTags(
      paragraph
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<input[^>]*>/gi, " ")
        .replace(/<div[^>]*compact_audio_player_wrapper[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, " ")
    );

    const match = text.match(/^(.+?)\s+["“](.+?)["”]\s*$/);
    if (!match) continue;

    const headword = cleanText(match[1]).replace(/^Audio:\s*\S+\s*/i, "");
    const gloss = cleanText(match[2]);
    if (!headword || !gloss || headword.length > 80 || gloss.length > 160) continue;
    if (/^[ABCD]:/.test(headword)) continue;

    items.push({
      headword,
      gloss,
      audioUrl: audio ? decodeEntities(audio).replace(/\?_=.+$/, "") : null,
    });
  }

  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.headword}::${item.gloss}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function lessonNumberFromTitle(title) {
  const match = decodeEntities(title).match(/Tlamachtiliztli\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function parseLessonTitle(title) {
  const clean = stripTags(title);
  const withoutPrefix = clean.replace(/^Tlamachtiliztli\s+\d+\s*\(Lesson\s+\d+\)\s*/i, "");
  const match = withoutPrefix.match(/^(.+?)\s*\(([^()]*)\)\.?$/);
  return {
    title: clean,
    nahuatlTitle: match ? cleanText(match[1]) : cleanText(withoutPrefix),
    englishTitle: match ? cleanText(match[2]) : "",
  };
}

async function importRenderedPage(source) {
  await delay(350);
  const html = await fetchText(source.link);
  const entryHtml = extractEntryHtml(html);
  const titleHtml = getMatch(html, /<h1[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
    source.title?.rendered ||
    source.title ||
    source.slug;
  const text = htmlToText(entryHtml);

  return {
    title: stripTags(titleHtml),
    slug: source.slug,
    originalUrl: source.link,
    modified: source.modified ?? null,
    sections: splitSections(text),
    mediaLinks: extractMediaLinks(entryHtml),
  };
}

async function main() {
  console.log("Checking robots.txt...");
  const robots = await fetchText(`${BASE_URL}/robots.txt`);
  if (/Disallow:\s*\/\s*$/m.test(robots)) {
    throw new Error("robots.txt disallows crawling the entire site.");
  }

  console.log("Fetching WordPress post and page indexes...");
  const [posts, pages] = await Promise.all([fetchJson(POSTS_URL), fetchJson(PAGES_URL)]);

  const lessons = posts
    .filter((post) => post.link && !post.link.includes("/es/"))
    .map((post) => ({ ...post, lessonNumber: lessonNumberFromTitle(post.title.rendered) }))
    .filter((post) => post.lessonNumber && /\(Lesson\s+\d+\)/i.test(decodeEntities(post.title.rendered)))
    .sort((a, b) => a.lessonNumber - b.lessonNumber);

  const seenLessons = new Set();
  const uniqueLessons = lessons.filter((lesson) => {
    if (seenLessons.has(lesson.lessonNumber)) return false;
    seenLessons.add(lesson.lessonNumber);
    return true;
  });

  console.log(`Importing ${uniqueLessons.length} English lessons...`);
  const importedLessons = [];
  for (const lesson of uniqueLessons) {
    const page = await importRenderedPage(lesson);
    const parsedTitle = parseLessonTitle(lesson.title.rendered);
    importedLessons.push({
      number: lesson.lessonNumber,
      wordpressId: lesson.id,
      ...parsedTitle,
      slug: lesson.slug,
      originalUrl: lesson.link,
      modified: lesson.modified ?? null,
      sections: page.sections,
      vocabulary: extractVocabulary(extractEntryHtml(await fetchText(lesson.link))),
      mediaLinks: page.mediaLinks,
    });
    console.log(`  ${lesson.lessonNumber}. ${parsedTitle.nahuatlTitle}`);
    await delay(350);
  }

  const pageBySlug = new Map(pages.map((page) => [page.slug, page]));
  const supportPages = [];
  for (const support of SUPPORT_PAGES) {
    const page = pageBySlug.get(support.slug);
    if (!page) continue;
    const imported = await importRenderedPage(page);
    supportPages.push({ kind: support.kind, ...imported });
    console.log(`  page: ${support.slug}`);
  }

  const output = {
    source: {
      name: "Nāhuatlahtolli",
      subtitle: "A Beginner to Advanced Level Nahuatl Online Course",
      originalUrl: BASE_URL,
      oerListingUrl: "https://coerll.utexas.edu/coerll/oer/nahuatlahtolli/",
      publisher: "COERLL, The University of Texas at Austin",
      authors: AUTHORS,
      license: {
        name: "Creative Commons Attribution-ShareAlike 4.0 International",
        shortName: "CC BY-SA 4.0",
        url: "https://creativecommons.org/licenses/by-sa/4.0/",
      },
      importMethod: "Public WordPress post index plus rendered public lesson pages; robots.txt checked before import.",
      robotsTxt: robots.trim(),
      importedAt: new Date().toISOString(),
      notes: [
        "Imported text is adapted for Itzli display and practice context.",
        "Media links are retained as source links only; this importer does not download or rehost course media.",
        "UT Austin, COERLL, AILLA, and LLILAS logos are not imported as app assets.",
      ],
    },
    supportPages,
    lessons: importedLessons,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
