/* Build original lesson groupings from approved public facts, never book pages. */
const fs = require('node:fs');
const lexicon = require('../src/data/v3-verified-lexicon.json');
const packs = require('../src/data/lexical-expansion.json');
const course = require('../src/data/v3-original-course.json');
const { toInaliOrthography } = require('../public/nahuatl-orthography.js');
const topics = [
  ['conversation', 'Everyday exchanges', 'Intercambios cotidianos', 'Recognize the words used to ask, answer and connect an exchange.', 'Reconoce las palabras para preguntar, responder y conectar un intercambio.'],
  ['people', 'People and relationships', 'Personas y relaciones', 'Keep people and relationships clear using the documented words.', 'Distingue personas y relaciones usando las palabras documentadas.'],
  ['food', 'Food and drink', 'Comida y bebidas', 'Recall the names and actions used around food and drink.', 'Recuerda los nombres y las acciones relacionados con la comida y las bebidas.'],
  ['home', 'Home and belongings', 'Hogar y pertenencias', 'Identify useful objects, places and belongings.', 'Identifica objetos, lugares y pertenencias útiles.'],
  ['body', 'The body and personal care', 'El cuerpo y el cuidado personal', 'Recognize body words and actions with their exact meanings.', 'Reconoce palabras del cuerpo y acciones con sus significados precisos.'],
  ['description', 'Describe what you notice', 'Describe lo que observas', 'Choose the precise learned description and recall its form.', 'Elige la descripción aprendida precisa y recuerda su forma.'],
  ['time', 'Time and everyday rhythm', 'Tiempo y ritmo cotidiano', 'Distinguish the learned time and frequency references.', 'Distingue las referencias aprendidas de tiempo y frecuencia.'],
  ['place', 'Places and movement', 'Lugares y movimiento', 'Keep location, direction and movement meanings distinct.', 'Distingue los significados de lugar, dirección y movimiento.'],
  ['nature', 'Land, water and weather', 'Tierra, agua y clima', 'Recall documented words for the world around you.', 'Recuerda palabras documentadas para el mundo que te rodea.'],
  ['animals', 'Animals and living things', 'Animales y seres vivos', 'Identify living things using the supported names.', 'Identifica seres vivos usando los nombres documentados.'],
  ['plants', 'Plants and the milpa', 'Plantas y milpa', 'Recall plants and words used around growing and harvesting.', 'Recuerda plantas y palabras relacionadas con el cultivo y la cosecha.'],
  ['work', 'Work and making things', 'Trabajo y creación', 'Recall the precise actions and objects used in everyday work.', 'Recuerda acciones y objetos precisos del trabajo cotidiano.'],
  ['thought', 'Thoughts, feelings and communication', 'Pensamientos, sentimientos y comunicación', 'Distinguish learned words for thinking, feeling and communicating.', 'Distingue palabras aprendidas para pensar, sentir y comunicar.'],
  ['numbers', 'Amounts and counting', 'Cantidades y conteo', 'Keep the documented quantities and counting references distinct.', 'Distingue las cantidades y las referencias documentadas de conteo.'],
  ['actions', 'Make your actions precise', 'Expresa tus acciones con precisión', 'Learn each action with its documented person, object and usage.', 'Aprende cada acción con su persona, objeto y uso documentados.'],
  ['community', 'Community and cultural words', 'Comunidad y palabras culturales', 'Recall community words while retaining their specific context.', 'Recuerda palabras de la comunidad conservando su contexto específico.'],
  ['everyday', 'More useful everyday words', 'Más palabras útiles de la vida cotidiana', 'Learn the precise meaning and use of each documented word.', 'Aprende el significado preciso y el uso de cada palabra documentada.'],
  ['reference', 'Understand how words are built', 'Comprende cómo se forman las palabras', 'Learn reference forms and their usage notes before using them in a larger expression.', 'Aprende las formas de referencia y sus notas de uso antes de emplearlas en una expresión mayor.'],
];
const patterns = [
  ['conversation', /\b(who|what|why|how|yes|no|nothing|hello|goodbye|thanks|thank|question|answer|perhaps|maybe|if|because|although|therefore)\b/],
  ['people', /\b(person|people|woman|man|child|boy|girl|baby|mother|father|parent|sibling|brother|sister|cousin|uncle|aunt|grand|wife|husband|godfather|godson|friend|relative|family|neighbor|student|teacher)\b/],
  ['food', /\b(eat|ate|eating|drink|drank|food|meal|hungry|thirsty|tortilla|coffee|atole|sauce|mole|bread|sugar|salt|chili|bean|fruit|meat|cook|juice|sweet potato|tamale|chocolate)\b/],
  ['body', /\b(body|head|hair|eye|ear|nose|mouth|tongue|tooth|teeth|neck|breast|chest|belly|stomach|arm|hand|finger|leg|foot|feet|skin|bone|blood|heart|illness|sick|pain|wash|bathe|comb|brush|health|doctor|medicine)\b/],
  ['time', /\b(day|night|morning|evening|afternoon|today|tomorrow|yesterday|week|month|year|hour|minute|time|always|never|sometimes|often|again|already|still|later|early|late)\b/],
  ['numbers', /\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|first|second|third|fourth|half|number|amount|quantity|count)\b/],
  ['home', /\b(house|home|room|door|window|bed|table|chair|clothing|clothes|shirt|dress|pants|skirt|shoe|blanket|bowl|cup|pot|plate|basket|bag|rope|cloth|broom|belonging|property)\b/],
  ['animals', /\b(animal|bird|dog|cat|pig|cow|bull|horse|donkey|sheep|goat|rabbit|deer|fish|snake|frog|turtle|butterfly|bee|ant|fly|worm|insect|spider|chicken|hen|turkey|duck|lizard|armadillo|wildlife)\b/],
  ['plants', /\b(plant|flower|tree|leaf|leaves|root|seed|corn|maize|milpa|grow|harvest|sow|planting|grass|wood|cactus|pine|oak)\b/],
  ['nature', /\b(water|river|lake|sea|rain|cloud|sky|sun|moon|star|wind|hill|mountain|land|earth|soil|stone|sand|mud|fire|smoke|cold weather|weather|thunder|lightning)\b/],
  ['place', /\b(where|here|there|near|far|inside|outside|under|above|behind|beside|across|place|road|path|street|town|city|village|walk|run|come|came|go|went|arrive|leave|enter|exit|move|carry|transport|travel)\b/],
  ['thought', /\b(think|thought|know|understand|remember|forget|feel|happy|sad|angry|afraid|fear|love|like|want|wish|hope|believe|dream|say|tell|speak|talk|listen|hear|read|write|learn|teach)\b/],
  ['work', /\b(work|job|make|made|build|repair|weave|grind|cut|sew|buy|bought|sell|money|price|pay|tool|knife|hammer|needle|paper|book)\b/],
  ['community', /\b(community|festival|ceremony|dance|music|song|drum|church|indigenous|nahua|mexica|ritual|respect|honored|sacred)\b/],
];
const dependentKinds = new Set(['dependent-reference-form','relational-reference-form','rule-composed-reference-form','source-extracted-reference-form','bound-stem','possessed-stem','relational-base','possessed-noun-reference']);
const expandedTopics = [
  ['conversation', /\b(true|confirmation|right\?|else|otherwise|someone|anyone|everyone|nobody|no one|each other)\b/],
  ['people', /\b(men|women|children|parents|siblings|brothers|sisters|cousins|uncles|aunts|grandfather|grandmother|nephew|niece|orphan|companions|relatives|friends|neighbors|students|teachers)\b/],
  ['food', /\b(beans|bean|oil|pork|beef|lard|crackling|cheese|milk|egg|eggs|beer|alcohol|honey|pepper|tomato|onion|avocado|orange|lemon|lime|banana|pineapple|mango|guava|cherry|peanut|peanuts|amaranth|rice|wheat|flour|garlic|potatoes|pumpkin|squash|melon|watermelon|coconut|candy|spice|fried|roast|fry|boil|steam|bake)\b/],
  ['body', /\b(shoulder|elbow|knee|heel|toe|toenail|nail|eyelash|eyebrow|chin|cheek|lip|scalp|thigh|lung|kidney|liver|intestine|brain|spine|joint|vein|artery|saliva|sweat|urine|wound|rash|cough|breathe|breath|bleed|vomit|fever|disease|heal|healing)\b/],
  ['home', /\b(toy|toys|net|nets|stove|furniture|tile|roof|wall|clay|jar|jars|bottle|bottles|bucket|towel|pillow|candle|soap|mirror|key|keys|lock|laundry|garment|garments|hat|hats|belt|belts|necklace|jewelry|sandals|socks)\b/],
  ['animals', /\b(louse|lice|heron|parrot|skunk|wasp|mosquito|flea|cockroach|cricket|grasshopper|scorpion|caterpillar|owl|hawk|eagle|vulture|bat|moth|rodent|mouse|rat|puma|jaguar|coyote|fox|squirrel|snail|crab|shrimp|pigs|dogs|cats|cattle|horses|birds|animals|species of)\b/],
  ['plants', /\b(reed|reeds|trees|plants|crops|seedling|marigold|tuber|flowers|petal|trunk|branch|branches|bark|vine|vines|herb|herbs|mushroom|mushrooms|cedar|cypress|willow|shade from trees)\b/],
  ['nature', /\b(hail|fog|lagoon|stream|streams|ocean|pond|spring|riverbed|coast|beach|forest|woods|rainbow|ice|snow|light|darkness|flood|drought|wet season|dry season|rainy)\b/],
  ['place', /\b(nowhere|somewhere|everywhere|municipality|region|territory|border|corner|side|sides|toward|towards|between|outdoor|indoor|north|south|east|west)\b/],
  ['work', /\b(homework|studies|study|school|schools|instruction|clean|sweep|dig|planting|harvesting|paint|printing|masonry|carpenter|merchant|sale|sales|cost|value|coins|coin)\b/],
  ['community', /\b(celebration|party|parties|fiesta|custom|tradition|indigenous|language|languages|speech|story|history|heaven|spirit|god|deity|soul|holy|sacred|cross|religion|assembly|council|government|authority|leader)\b/],
];
function topicFor(entry) {
  if (dependentKinds.has(entry.formKind) || /(?:root|stem|prefix|reference)/i.test(entry.partOfSpeech)) return 'reference';
  const meaning = entry.meaningEn.toLowerCase();
  if (/(?:number|numeral|ordinal|quantity|quantifier)/i.test(entry.partOfSpeech)) return 'numbers';
  if (/(?:adjective|adjectival)/i.test(entry.partOfSpeech)) return 'description';
  if (/(?:pronoun|interrogative|conjunction|demonstrative|particle|determiner|negation)/i.test(entry.partOfSpeech)) return 'conversation';
  for (const [topic, pattern] of expandedTopics) if (pattern.test(meaning)) return topic;
  for (const [topic, pattern] of patterns) if (pattern.test(meaning)) return topic;
  if (/verb/i.test(entry.partOfSpeech)) return 'actions';
  if (/adverb/i.test(entry.partOfSpeech)) return 'description';
  return 'everyday';
}
const entries = lexicon.entries.filter(e => e.newToCourse).map(e=>({...e,origin:'verified'}));
const existing = new Set(entries.map(e=>e.display.toLocaleLowerCase()));
for (const entry of packs) {
  const display = toInaliOrthography(entry.sourceSpelling.replace(/\(ø\)/g,'').replace(/[/?¿]/g,'')).trim();
  if (existing.has(display.toLocaleLowerCase())) continue;
  entries.push({id:entry.id,display,meaningEn:entry.english,partOfSpeech:entry.partOfSpeech,formKind:'source-headword',origin:'earlier-pack'});
  existing.add(display.toLocaleLowerCase());
}
const lessons=[];
for (const [topic,titleEn,titleEs,goalEn,goalEs] of topics) {
  const words=entries.filter(e=>topicFor(e)===topic).sort((a,b)=>a.display.localeCompare(b.display,'es')||a.id.localeCompare(b.id));
  for(let offset=0;offset<words.length;offset+=8) {
    const ordinal=offset/8+1, selected=words.slice(offset,offset+8);
    lessons.push({lessonNumber:90+lessons.length,progressId:`v3-vocab-${topic}-${String(ordinal).padStart(3,'0')}`,topic,titleEn,titleEs,goalEn,goalEs,ordinal,entryIds:selected.map(e=>e.id)});
  }
}
if(new Set(lessons.flatMap(l=>l.entryIds)).size!==entries.length)throw Error('Every approved word requires exactly one lesson');
const grammarLessons=course.units.map((unit,index)=>({lessonNumber:44+index,sourceUnitId:unit.id}));
const result={schemaVersion:1,organization:'Original Itzli topical groupings of approved public entries. No book order, wording or exercises imported.',maxWordsPerLesson:8,counts:{verifiedNewEntries:lexicon.entries.filter(e=>e.newToCourse).length,earlierPackEntries:entries.filter(e=>e.origin==='earlier-pack').length,vocabularyLessons:lessons.length},grammarLessons,lessons};
if (fs.existsSync('src/data/course-path-extension.json')) {
  const prior = JSON.parse(fs.readFileSync('src/data/course-path-extension.json','utf8'));
  if (prior.grammarLessons && JSON.stringify(prior.grammarLessons)!==JSON.stringify(grammarLessons)) {
    throw Error('Grammar route IDs are frozen. Append a reviewed mapping for new units without taking existing vocabulary route IDs.');
  }
  if (!process.argv.includes('--review-unpublished-organization') && JSON.stringify(prior.lessons.map(l=>[l.lessonNumber,l.progressId,l.entryIds])) !== JSON.stringify(result.lessons.map(l=>[l.lessonNumber,l.progressId,l.entryIds]))) {
    throw Error('Existing lesson memberships are frozen for learner progress. Review and append new lessons explicitly; do not reshuffle saved lesson IDs.');
  }
}
fs.writeFileSync('src/data/course-path-extension.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.counts));
