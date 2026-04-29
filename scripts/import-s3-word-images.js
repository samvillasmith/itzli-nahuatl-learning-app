#!/usr/bin/env node
/**
 * Imports public S3 word-image keys into src/data/s3-word-images.json.
 *
 * The S3 image bucket is keyed by Spanish/Mero concepts such as
 * "10001-cabeza.webp". This script lists the bucket, maps those Spanish
 * concepts to English gloss concepts, then connects the best matches to the
 * Nahuatl headwords in lesson_vocab.
 */

const fs = require("fs");
const https = require("https");
const path = require("path");
const Database = require("better-sqlite3");

const BUCKET_URL = "https://mero-mero-app.s3.us-east-1.amazonaws.com/";
const PREFIX = "word-images/";
const DB_PATH =
  process.env.DATABASE_PATH ||
  path.resolve(__dirname, "..", "fcn_master_lexicon_phase8_6_primer.sqlite");
const OUT_PATH = path.resolve(__dirname, "..", "src", "data", "s3-word-images.json");
const AUDIT_PATH = path.resolve(__dirname, "..", "data", "s3-word-images-audit.json");

const SPANISH_TO_ENGLISH = {
  "hola": ["hello", "greeting"],
  "buenos dias": ["good day", "good morning"],
  "buen dia": ["good day", "good morning"],
  "buenas tardes": ["good afternoon"],
  "buenas noches": ["good night", "good evening"],
  "como esta": ["how are you"],
  "como estas": ["how are you"],
  "bien gracias": ["well thanks", "fine thanks"],
  "mucho gusto": ["nice to meet you"],
  "por favor": ["please"],
  "saludos": ["greetings"],
  "perdon": ["forgive me", "sorry"],
  "lo siento": ["sorry"],
  "felicidades": ["congratulations"],
  "que te vaya bien": ["may it go well"],
  "que te mejores": ["get well"],

  "cabeza": ["head"],
  "ojo": ["eye"],
  "boca": ["mouth"],
  "mano": ["hand"],
  "pie": ["foot"],
  "brazo": ["arm"],
  "pierna": ["leg"],
  "estomago": ["stomach", "belly"],
  "espalda": ["back"],
  "dolor": ["pain"],
  "fiebre": ["fever"],
  "tos": ["cough"],
  "gripe": ["flu", "cold"],
  "gripa": ["flu", "cold"],
  "sintoma": ["symptom"],
  "receta": ["prescription", "recipe"],
  "medicina": ["medicine"],
  "pastilla": ["pill"],
  "farmacia": ["pharmacy"],
  "farmaceutico": ["pharmacist"],
  "jarabe": ["syrup"],
  "crema": ["cream"],
  "inyeccion": ["injection"],
  "dosis": ["dose"],
  "capsula": ["capsule"],
  "antibiotico": ["antibiotic"],
  "doctor": ["doctor"],
  "consulta": ["consultation"],
  "cita": ["appointment"],
  "hospital": ["hospital"],
  "ambulancia": ["ambulance"],
  "accidente": ["accident"],
  "fractura": ["fracture", "broken bone"],
  "tratamiento": ["treatment"],
  "diabetes": ["diabetes"],

  "familia": ["family"],
  "mama": ["mother"],
  "papa": ["father"],
  "padre": ["father"],
  "hermano": ["brother"],
  "hijo": ["son", "child"],
  "esposo": ["husband"],
  "abuelo": ["grandfather"],
  "tio": ["uncle"],
  "primo": ["cousin"],
  "senor": ["sir", "man"],
  "senora": ["madam", "woman"],
  "joven": ["young person", "youth"],
  "persona": ["person"],
  "amigos": ["friends"],

  "casa": ["house", "home"],
  "departamento": ["apartment"],
  "recamara": ["bedroom"],
  "sala": ["living room"],
  "cocina": ["kitchen"],
  "bano": ["bathroom"],
  "mesa": ["table"],
  "silla": ["chair"],
  "cama": ["bed"],
  "puerta": ["door"],
  "estufa": ["stove"],
  "horno": ["oven"],
  "comal": ["comal", "griddle"],
  "olla": ["pot"],
  "sarten": ["pan"],
  "cuchillo": ["knife"],
  "cuchara": ["spoon"],
  "tenedor": ["fork"],
  "plato": ["plate"],
  "caja": ["box"],
  "bolsa": ["bag"],
  "canasta": ["basket"],
  "escoba": ["broom"],
  "lavadora": ["washing machine"],
  "detergente": ["detergent"],
  "cloro": ["chlorine", "bleach"],

  "escuela": ["school"],
  "maestro": ["teacher"],
  "alumno": ["student"],
  "salon": ["classroom"],
  "tarea": ["homework", "task"],
  "examen": ["exam"],
  "cuaderno": ["notebook"],
  "lapiz": ["pencil"],
  "libro": ["book"],
  "pluma": ["pen"],
  "goma": ["eraser"],
  "regla": ["ruler"],
  "tijeras": ["scissors"],
  "pegamento": ["glue"],
  "papeleria": ["paper shop", "stationery"],
  "papel": ["paper"],

  "doctor": ["doctor"],
  "maestro": ["teacher"],
  "ingeniero": ["engineer"],
  "abogado": ["lawyer"],
  "enfermero": ["nurse"],
  "policia": ["police"],
  "mecanico": ["mechanic"],
  "chofer": ["driver"],
  "vendedor": ["seller", "vendor"],
  "albanil": ["mason", "builder"],
  "trabajo": ["work"],
  "chamba": ["work"],
  "trabajar": ["work"],
  "empresa": ["company"],
  "oficina": ["office"],
  "jefe": ["boss"],
  "companero": ["companion", "coworker"],

  "mercado": ["market"],
  "tianguis": ["market", "open-air market"],
  "puesto": ["stand", "market stall"],
  "plaza": ["plaza", "market"],
  "zocalo": ["plaza"],
  "iglesia": ["church"],
  "parque": ["park"],
  "museo": ["museum"],
  "avenida": ["avenue"],
  "esquina": ["corner"],
  "calle": ["street"],
  "entrada": ["entrance", "enter"],
  "centro": ["center", "downtown"],
  "colonia": ["neighborhood"],
  "pueblo": ["town"],
  "ciudad": ["city"],
  "altepetl": ["town", "city"],

  "peso": ["peso", "money"],
  "lana": ["money"],
  "dinero": ["money"],
  "cuanto": ["how much", "how many"],
  "cuesta": ["cost"],
  "precio": ["price"],
  "cambio": ["change"],
  "barato": ["cheap"],
  "caro": ["expensive"],
  "comprar": ["buy"],
  "vender": ["sell"],

  "comida": ["food"],
  "desayuno": ["breakfast"],
  "cena": ["dinner"],
  "tortilla": ["tortilla"],
  "taco": ["taco"],
  "salsa": ["salsa"],
  "picante": ["spicy"],
  "agua": ["water"],
  "agua embotellada": ["bottled water"],
  "agua fresca": ["fresh water", "fruit drink"],
  "jugo": ["juice"],
  "leche": ["milk"],
  "cafe": ["coffee"],
  "te": ["tea"],
  "refresco": ["soda"],
  "cerveza": ["beer"],
  "tequila": ["tequila"],
  "vino": ["wine"],
  "mesero": ["waiter"],
  "menu": ["menu"],
  "platillo": ["dish"],
  "postre": ["dessert"],
  "propina": ["tip"],
  "tacos": ["tacos"],
  "elote": ["corn", "fresh ear of corn"],
  "salsita": ["salsa"],
  "comal": ["comal", "griddle"],
  "tortilla": ["tortilla"],
  "sintli": ["corn"],
  "chankaka": ["sugar", "piloncillo"],
  "azucar": ["sugar"],
  "miel": ["honey"],
  "nakatl": ["meat"],
  "mariscos": ["seafood"],
  "vegetariano": ["vegetarian"],

  "perro": ["dog"],
  "gato": ["cat"],
  "vaca": ["cow"],
  "caballo": ["horse"],
  "pollo": ["chicken"],
  "cerdo": ["pig"],
  "pajaro": ["bird"],
  "pez": ["fish"],
  "raton": ["mouse"],
  "arana": ["spider"],
  "buey": ["ox"],

  "feliz": ["happy"],
  "triste": ["sad"],
  "enojado": ["angry"],
  "cansado": ["tired"],
  "preocupado": ["worried"],
  "nervioso": ["nervous"],
  "asustado": ["scared", "frightened"],
  "aburrido": ["bored"],
  "tranquilo": ["calm"],
  "molesto": ["annoyed", "upset"],
  "bueno": ["good"],
  "buena": ["good"],
  "malo": ["bad"],
  "mala": ["bad"],
  "grande": ["big", "large"],
  "alto": ["tall", "high"],
  "alta": ["tall", "high"],
  "bonito": ["pretty", "beautiful"],
  "bonita": ["pretty", "beautiful"],
  "chico": ["small"],
  "chiquito": ["little", "small"],
  "fuerte": ["strong"],
  "leve": ["light", "mild"],
  "rapido": ["fast"],
  "sucio": ["dirty"],
  "limpio": ["clean"],

  "blanco": ["white"],
  "negro": ["black"],
  "rojo": ["red"],
  "verde": ["green"],
  "azul": ["blue"],
  "amarillo": ["yellow"],
  "gris": ["gray", "grey"],
  "color": ["color"],

  "yo": ["i", "me"],
  "tu": ["you"],
  "usted": ["you"],
  "el": ["he", "him"],
  "ella": ["she", "her"],
  "nosotros": ["we", "us"],
  "ustedes": ["you all"],
  "ellos": ["they", "them"],

  "cero": ["zero"],
  "uno una": ["one"],
  "dos": ["two"],
  "tres": ["three"],
  "cuatro": ["four"],
  "cinco": ["five"],
  "seis": ["six"],
  "siete": ["seven"],
  "ocho": ["eight"],
  "nueve": ["nine"],
  "diez": ["ten"],
  "quince": ["fifteen"],
  "veinte": ["twenty"],
  "treinta": ["thirty"],
  "cuarenta": ["forty"],
  "cincuenta": ["fifty"],
  "cien": ["hundred", "one hundred"],
  "ciento": ["hundred", "one hundred"],
  "mil": ["thousand"],

  "enero": ["january"],
  "febrero": ["february"],
  "marzo": ["march"],
  "abril": ["april"],
  "mayo": ["may"],
  "junio": ["june"],
  "julio": ["july"],
  "agosto": ["august"],
  "septiembre": ["september"],
  "octubre": ["october"],
  "noviembre": ["november"],
  "diciembre": ["december"],

  "tiempo": ["time", "weather"],
  "calor": ["heat", "hot"],
  "frio": ["cold"],
  "lluvia": ["rain"],
  "sol": ["sun"],
  "nublado": ["cloudy"],
  "semana": ["week"],
  "lunes": ["monday"],
  "viernes": ["friday"],
  "hoy": ["today"],
  "manana": ["tomorrow", "morning"],
  "ayer": ["yesterday"],
  "siempre": ["always"],
  "a veces": ["sometimes"],
  "nunca": ["never"],
  "aqui": ["here"],
  "ahi": ["there"],
  "alla": ["there"],
  "cerca": ["near", "close"],
  "lejos": ["far"],
  "derecha": ["right"],
  "izquierda": ["left"],
  "enfrente": ["in front"],
  "atras": ["behind"],

  "caminar": ["walk"],
  "correr": ["run"],
  "nadar": ["swim"],
  "jugar": ["play"],
  "ganar": ["win"],
  "perder": ["lose"],
  "salir": ["go out", "leave", "exit"],
  "llegar": ["arrive"],
  "seguir": ["follow"],
  "cruzar": ["cross"],
  "leer": ["read"],
  "mandar": ["send"],
  "estudiar": ["study"],
  "presentar": ["present"],
  "opinar": ["give an opinion"],
  "proponer": ["propose"],
  "confirmar": ["confirm"],
  "contestar": ["answer"],
  "limpiar": ["clean"],
  "trapear": ["mop"],
  "barrer": ["sweep"],
  "lavar": ["wash"],
  "ayuda": ["help"],
  "emergencia": ["emergency"],
  "robar": ["steal"],
  "perderse": ["get lost"],
  "sudar": ["sweat"],
  "cantar": ["sing"],
  "bailar": ["dance"],
  "tocar": ["touch", "play music"],
  "hablar": ["speak", "talk"],
  "hacer": ["do", "make"],
  "tener": ["have"],
  "ir": ["go"],
  "dormir": ["sleep"],
  "comer": ["eat"],
  "beber": ["drink"],
  "aprender": ["learn"],
  "vivir": ["live"],
  "escribir": ["write"],
  "abrir": ["open"],
  "recibir": ["receive"],
  "subir": ["go up", "climb"],

  "musica": ["music"],
  "cancion": ["song"],
  "cantante": ["singer"],
  "concierto": ["concert"],
  "pelicula": ["movie"],
  "serie": ["series"],
  "guitarra": ["guitar"],
  "playa": ["beach"],
  "hotel": ["hotel"],
  "avion": ["airplane"],
  "maleta": ["suitcase"],
  "arena": ["sand"],
  "mar": ["sea"],
  "carro": ["car"],
  "camion": ["truck", "bus"],
  "metro": ["subway"],
  "taxi": ["taxi"],
  "parada": ["stop"],
  "estacion": ["station"],
  "boleto": ["ticket"],
  "trafico": ["traffic"],
  "mapa": ["map"],

  "ropa": ["clothes"],
  "playera": ["shirt"],
  "chamarra": ["jacket"],
  "pantalon": ["pants"],
  "tenis": ["shoes", "sneakers"],
  "vestido": ["dress"],
  "talla": ["size"],

  "altar": ["altar"],
  "ofrenda": ["offering"],
  "cempasuchil": ["marigold"],
  "calavera": ["skull"],
  "pan de muerto": ["bread of the dead"],
  "papel picado": ["paper banner"],
  "copal": ["copal"],
  "veladora": ["candle"],
  "catrina": ["catrina"],
};

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 180)}`));
            return;
          }
          resolve(body);
        });
      })
      .on("error", reject);
  });
}

function textBetween(xml, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  return [...xml.matchAll(re)].map((match) =>
    match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'"),
  );
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripSpanishArticle(slug) {
  return normalize(slug).replace(/^(el|la|los|las|un|una|unos|unas)\s+/, "").trim();
}

function keySlug(key) {
  const file = decodeURIComponent(key).split("/").pop() ?? "";
  return file.replace(/\.(avif|webp|png|jpe?g|gif)$/i, "").replace(/^\d+-/, "");
}

function cleanGloss(gloss) {
  return String(gloss || "")
    .replace(/\s*\[(?:❌|⚠️)[^\]]*\].*$/g, "")
    .replace(/^(his|her|its|their|my|our|your)(,\s*(his|her|its|their|my|our|your))*\s+/i, "")
    .replace(/^(his\/her|his or her)\s+/i, "")
    .replace(/^to\s+/i, "")
    .trim();
}

function glossConcepts(gloss) {
  const cleaned = cleanGloss(gloss);
  const parts = cleaned
    .split(/\s*(?:;|,|\/|\(|\)|\bor\b|\band\b)\s*/i)
    .map((part) => normalize(part.replace(/^to\s+/i, "")))
    .filter(Boolean);

  const concepts = new Set([normalize(cleaned), ...parts]);
  for (const part of [...concepts]) {
    if (part.endsWith("s") && part.length > 3) concepts.add(part.slice(0, -1));
    if (part.startsWith("to ")) concepts.add(part.slice(3));
  }
  return [...concepts].filter(Boolean);
}

async function listKeys() {
  const keys = [];
  let token = "";

  do {
    const url =
      `${BUCKET_URL}?list-type=2&prefix=${encodeURIComponent(PREFIX)}&max-keys=1000` +
      (token ? `&continuation-token=${encodeURIComponent(token)}` : "");
    const xml = await get(url);
    keys.push(...textBetween(xml, "Key").filter((key) => key !== PREFIX));
    token = textBetween(xml, "NextContinuationToken")[0] ?? "";
  } while (token);

  return keys;
}

function buildConceptIndex(keys) {
  const conceptToKey = new Map();
  const slugAudit = [];

  for (const key of keys) {
    const slug = keySlug(key);
    const stripped = stripSpanishArticle(slug);
    const concepts = new Set([normalize(slug), stripped]);
    const translated = SPANISH_TO_ENGLISH[stripped] || SPANISH_TO_ENGLISH[normalize(slug)] || [];
    for (const item of translated) concepts.add(normalize(item));

    for (const concept of concepts) {
      if (concept && !conceptToKey.has(concept)) conceptToKey.set(concept, key.slice(PREFIX.length));
    }
    slugAudit.push({ key, slug: stripped, concepts: [...concepts] });
  }

  return { conceptToKey, slugAudit };
}

function loadVocab() {
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db
    .prepare(
      `SELECT id, display_form, gloss_en, part_of_speech
       FROM lesson_vocab
       WHERE gloss_en NOT LIKE '%MISPLACED%'
       ORDER BY lesson_number, rank`,
    )
    .all();
  db.close();
  return rows;
}

function matchVocab(vocab, conceptToKey) {
  const manifest = {};
  const matched = [];
  const unmatched = [];

  for (const row of vocab) {
    if (normalize(row.part_of_speech) === "letter") {
      unmatched.push({ headword: row.display_form, gloss: row.gloss_en, reason: "letter" });
      continue;
    }

    const candidates = glossConcepts(row.gloss_en);
    const key = candidates.map((candidate) => conceptToKey.get(candidate)).find(Boolean);
    if (key) {
      manifest[row.display_form] = {
        key,
        author: "Itzli / Mero Mero S3",
        license: "Project word-image asset",
        alt: cleanGloss(row.gloss_en) || row.display_form,
      };
      matched.push({ headword: row.display_form, gloss: row.gloss_en, key });
    } else {
      unmatched.push({ headword: row.display_form, gloss: row.gloss_en });
    }
  }

  return { manifest, matched, unmatched };
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`DB not found at ${DB_PATH}`);
    process.exit(1);
  }

  const keys = await listKeys();
  const { conceptToKey, slugAudit } = buildConceptIndex(keys);
  const vocab = loadVocab();
  const { manifest, matched, unmatched } = matchVocab(vocab, conceptToKey);

  fs.writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2) + "\n");
  fs.mkdirSync(path.dirname(AUDIT_PATH), { recursive: true });
  fs.writeFileSync(
    AUDIT_PATH,
    JSON.stringify(
      {
        s3Keys: keys.length,
        indexedConcepts: conceptToKey.size,
        vocabItems: vocab.length,
        matched: matched.length,
        unmatched: unmatched.length,
        matchedSample: matched.slice(0, 80),
        unmatchedSample: unmatched.slice(0, 120),
        slugSample: slugAudit.slice(0, 120),
        availableSlugs: slugAudit.map(({ key, slug }) => ({ key, slug })),
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`Listed ${keys.length} S3 word images.`);
  console.log(`Matched ${matched.length} of ${vocab.length} lesson vocab rows.`);
  console.log(`Manifest: ${OUT_PATH}`);
  console.log(`Audit: ${AUDIT_PATH}`);
}

main().catch((error) => {
  console.error(error.message);
  console.error(
    "Could not list the public S3 prefix. Enable ListBucket for word-images/ or provide a manifest.",
  );
  process.exit(1);
});
