"use strict";

const course = require("../../src/data/nahuatlahtolli-course.json");

function sourceMetadata(lessonNumbers) {
  return {
    source_name: course.source.name,
    source_authors: course.source.authors,
    source_license: "CC BY-SA (publisher listing; version unspecified)",
    source_license_url: course.source.oerListingUrl,
    source_license_listing_url: course.source.oerListingUrl,
    source_license_version_confirmed: false,
    contribution_license: "CC BY-SA 4.0",
    contribution_license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
    changes: "Selected source expressions and original Itzli glosses, grammar summaries and arrangement. Original source and media notices remain applicable; the source-license version is not confirmed.",
    source_lesson_numbers: lessonNumbers,
    source_urls: lessonNumbers.map((number) => {
      const lesson = course.lessons.find((candidate) => candidate.number === number);
      if (!lesson) throw new Error(`Missing course reference ${number}`);
      return lesson.originalUrl;
    }),
    evidence_scope: "Selected Chicontepec course examples; not universal EHN certification",
  };
}

// Source spellings, not freely reconstructed conversation phrases. App spelling
// is an adaptation, not a claim that all EHN communities use identical forms.
const COURSE_PHRASES = [
  { phrase: "Piyali", gloss: "Hello", lessons: [2] },
  { phrase: "Na notōcah Paty", gloss: "My name is Paty", lessons: [3] },
  { phrase: "¿Quēniuhqui motōcah?", gloss: "What is your name?", lessons: [3] },
  { phrase: "¿Cānin tiēhua?", gloss: "Where are you from?", lessons: [3] },
  { phrase: "Nicān niitztoc", gloss: "I am here", lessons: [2] },
  { phrase: "Nitequiti", gloss: "I work", lessons: [6] },
  { phrase: "Nichōcac", gloss: "I cried", lessons: [14] },
  { phrase: "Noconēuh", gloss: "My child", lessons: [8] },
  { phrase: "Nimomachtiqui", gloss: "I will come to study", lessons: [26] },
  { phrase: "Nimotlaloyaya", gloss: "I was running", lessons: [28] },
];

const GRAMMAR_SNIPPETS = [
  {
    title: "Evidence and course variety", lessons: [3, 6],
    content: "These selected examples follow the native-speaker Nāhuatlahtolli course from Chicontepec, Veracruz; they do not establish universal EHN consensus. A retrieved root or automated analysis does not authorize new conjugations, plurals, possessed forms, or derivations. Withhold forms when source evidence is missing or conflicting.",
  },
  {
    title: "Regular present example", lessons: [6],
    content: "The source's tequiti paradigm is nitequiti (I work), titequiti (you work), tequiti (he/she works), titequitih (we work), intequitih (you all work), tequitih (they work). The second-person plural prefix is in-. This regular example does not supply irregular paradigms or all noun-predicate endings.",
  },
  {
    title: "Independent pronouns", lessons: [3],
    content: "Source pronouns include na (I), ta (you), ya (he/she), tohhuantin (we), inmohhuantin (you all), and inihhuantin (they). Preserve the source's complete plural forms rather than replacing them with shorter forms from another variety.",
  },
  {
    title: "Object markers", lessons: [13],
    content: "Source object markers: nēch- (me), mītz- (you), c/qu/qui- (him/her/it), tēch- (us), mēch- (you all), quin- (them). App spellings include nech-, mits-, k-/ki-, tech-, mech-, kin-. Source Mēchitta means he/she/it sees you all, not I see you all. Learn object marking with the verb's meaning; it is not a way to address a listener regardless of the intended object.",
  },
  {
    title: "Possessives and learned endings", lessons: [8, 9],
    content: "Possessive prefixes are no- (my), mo- (your), ī- (his/her), to- (our), inmo- (your plural), inin- (their). Learn complete forms: noconēuh (my child), toconēhuan (our children), īicniuh (his/her sibling), inintōcah (their names). Do not obtain arbitrary possessed forms by stripping an ending and adding a prefix. Motōcah uses possessive mo-, not a reflexive verb marker.",
  },
  {
    title: "Completed actions", lessons: [14, 15, 16],
    content: "Chicontepec source past examples include nichōcac (I cried), niccōuhqui (I bought it), and nitlacuāhqui (I ate). They have learned stems/endings and lack the Classical o- augment. Do not impose one past suffix on every verb or label an unattested generated form as a source quotation.",
  },
  {
    title: "Future examples and pending transcription", lessons: [12],
    content: "Source singular examples nitequitiz (I will work) and nimomachtiz (I will study) appear as nitekitis and nimomachtis in app spelling. The source writes plural -zceh, while some app content uses -zqueh. This transcription/pronunciation contrast remains under review; do not resolve it by guessing or generate a complete plural future paradigm.",
  },
  {
    title: "Ongoing past actions and learned states", lessons: [24, 25, 28],
    content: "Lesson 28 teaches imperfect -yaya and plural -yayah: nipanoyaya (I was passing), nimotlaloyaya (I was running), niccuāyaya (I was eating it). State verbs have learned pasts niitztoya (I was in a place/state), niyatoya (I was sitting), niihcatoya (I was standing), and eltoya (it was). Do not append -toya to every action verb. Source existence past is oncac.",
  },
  {
    title: "Learned noun plurals and diminutives", lessons: [3, 5, 8, 20],
    content: "Learn plurals with each noun: cihuāmeh (women), momachtianih (students), toconēhuan (our children), pilcihuātzitzin (little women). Lesson 20's pil- precedes the noun base; -tzin/-tzitzin are suffixes in learned diminutive forms. Examples nopilahui (my dear little aunt), pilcīntzin (little corn). Do not append pil as a noun suffix or -tzin to any command as a general politeness rule.",
  },
  {
    title: "Lexical and reflexive mo-", lessons: [17],
    content: "The source uses mo- with subject prefixes in forms such as nimoitta (I see myself) and timotlalia (you sit). Mo- can express reflexive, reciprocal, or middle uses, or belong to a lexical verb. Do not turn possessive no-/mo-/to- into an automatically generated reflexive paradigm.",
  },
  {
    title: "Directional action suffixes", lessons: [26],
    content: "Source action suffixes include -co (came to do), -qui (will come to do), -to (went to do), and -ti (will go to do). Learned examples: nitlachpānaco (I came to sweep), nimomachtiqui (I will come to study), niātlacuito (I went to get water). These examples do not license arbitrary on-/hual- prefix combinations.",
  },
  {
    title: "Learned commands and limits on derivation", lessons: [2, 19],
    content: "Source commands include xipano (come in), xicalaqui (enter), and ximocehui (sit down/rest). Learn the actual command and its meaning. Applicatives, causatives, honorific verb constructions, compound verbs, and locative word formation require explicit evidence; do not generate them from blanket suffix recipes.",
  },
];

function loadPhrases() {
  return COURSE_PHRASES.map((item) => ({
    kind: "phrase", content: `${item.phrase} — ${item.gloss}`,
    metadata: { phrase: item.phrase, gloss: item.gloss, ...sourceMetadata(item.lessons) },
  }));
}

function loadGrammar() {
  return GRAMMAR_SNIPPETS.map((item) => ({
    kind: "grammar", content: `${item.title}: ${item.content}`,
    metadata: { title: item.title, ...sourceMetadata(item.lessons) },
  }));
}

module.exports = { loadPhrases, loadGrammar, sourceMetadata };
