// src/data/grammar-lessons.ts

export type Example = {
  nahuatl: string;
  breakdown: string;   // shows morpheme structure, e.g. "ni·tlamachtia"
  translation: string;
  note?: string;
};

export type ParadigmRow = {
  person: string;
  form: string;
  gloss: string;
};

export type GrammarSection =
  | { kind: 'prose'; heading?: string; text: string }
  | { kind: 'paradigm'; heading: string; caption?: string; headers: [string, string, string]; rows: ParadigmRow[] }
  | { kind: 'examples'; heading: string; items: Example[] }
  | { kind: 'rule'; title: string; text: string };

export type GrammarLesson = {
  id: string;
  title: string;
  nahuatlTitle: string;
  band: 'A1' | 'A2' | 'B1';
  shortDesc: string;
  sections: GrammarSection[];
  relatedUnits: number[];
};

export const GRAMMAR_LESSONS: GrammarLesson[] = [
  {
    id: 'alphabet',
    title: 'The EHN Alphabet',
    nahuatlTitle: 'Piltlahcuiloltzitzin',
    band: 'A1',
    shortDesc: 'Sounds, vowel length, and reading EHN orthography.',
    relatedUnits: [1],
    sections: [
      {
        kind: 'prose',
        text: `Eastern Huasteca Nahuatl (EHN) is written using the orthographic standard established by IDIEZ (Instituto de Docencia e Investigación Etnológica de Zacatecas), based on the speech of the Chicontepec region of Veracruz, Mexico. The writing system is largely phonemic — once you learn the rules, pronunciation follows naturally.\n\nNahuatl has been written in several different systems over the last 500 years. For a short explainer of the differences between IDIEZ, INALI, and the older SEP spellings — and why this course chose IDIEZ — see the "Orthographic Systems" lesson.`,
      },
      {
        kind: 'rule',
        title: 'Vowels',
        text: `EHN has four vowel qualities: a, e, i, o. Each can be short or long. Long vowels are marked with a macron (a horizontal bar above the letter): ā, ē, ī, ō. Length is meaningful — it can distinguish different words. For example, āmoxtli (book) vs. amoxtli would be different words if both existed.`,
      },
      {
        kind: 'paradigm',
        heading: 'Vowels',
        headers: ['Vowel', 'Example word', 'Meaning'],
        rows: [
          { person: 'a (short)', form: 'ātl', gloss: '(long ā) — water' },
          { person: 'e (short)', form: 'etl', gloss: 'bean' },
          { person: 'i (short)', form: 'cīntli', gloss: '(long ī) — corn ear' },
          { person: 'o (short)', form: 'tōnatiuh', gloss: '(long ō) — sun' },
          { person: 'ā (long)', form: 'āmoxtli', gloss: 'book' },
          { person: 'ē (long)', form: 'tēuctli', gloss: 'lord / sir' },
          { person: 'ī (long)', form: 'cīntli', gloss: 'corn ear' },
          { person: 'ō (long)', form: 'tōtolin', gloss: 'turkey' },
        ],
      },
      {
        kind: 'rule',
        title: 'Key consonants and sound clusters',
        text: `Most consonants are pronounced as in Spanish. Several sound combinations are unique to Nahuatl:\n\n• **tl** — a lateral affricate unique to Nahuatl. Formed by pressing the tongue to the roof of the mouth and releasing air sideways. Practice with: tlahtoa (to speak).\n\n• **tz** — like English "ts" in "cats". Example: tzan (head hair).\n\n• **x** — like English "sh" in "shoe". Example: xōchitl (flower).\n\n• **hu** / **uh** — represents the /w/ sound. At the start of a syllable: huey (big). At the end: āhuatl (oak).\n\n• **cu** / **uc** — represents /kw/ sound. Example: cuāhtli (eagle).\n\n• **qu** (before e/i) — represents the /k/ sound. Example: quēniuhqui (how).\n\n• **h** between vowels or at the end of a word — marks a glottal stop (a brief catch in the throat). Example: āxcan (now/today).`,
      },
      {
        kind: 'paradigm',
        heading: 'Special consonant clusters',
        headers: ['Spelling', 'Sound', 'Example'],
        rows: [
          { person: 'tl', form: '/tɬ/ (lateral affricate)', gloss: 'tlahtoa — to speak' },
          { person: 'tz', form: '/ts/ (like "ts" in cats)', gloss: 'tzahtzi — to shout' },
          { person: 'x', form: '/ʃ/ (like "sh")', gloss: 'xōchitl — flower' },
          { person: 'hu-', form: '/w/ (syllable onset)', gloss: 'huey — big' },
          { person: '-uh', form: '/w/ (syllable coda)', gloss: 'āhuatl — oak' },
          { person: 'cu- / -uc', form: '/kw/', gloss: 'cuāhtli — eagle' },
          { person: 'qu + e/i', form: '/k/', gloss: 'quēmman — when' },
          { person: 'c + a/o', form: '/k/', gloss: 'cālli — house' },
          { person: 'h (intervocalic)', form: 'glottal stop', gloss: 'āxcan — today/now' },
        ],
      },
      {
        kind: 'rule',
        title: 'Stress',
        text: `Stress in EHN falls on the second-to-last (penultimate) syllable in most words. For example: ni·**tla**·ma·ch·ti·a → stress on -tla-. Long vowels can also carry stress. In practice, you will acquire stress naturally through the dialogue exercises.`,
      },
      {
        kind: 'examples',
        heading: 'Practice reading these words',
        items: [
          { nahuatl: 'Piyalli', breakdown: 'Pi·ya·lli', translation: 'Hello / Greetings', note: 'Common EHN greeting' },
          { nahuatl: 'āxcan', breakdown: 'āx·can', translation: 'today / now', note: 'The h marks a glottal stop' },
          { nahuatl: 'tlahtoa', breakdown: 'tlah·to·a', translation: 'to speak', note: 'Note the tl- onset' },
          { nahuatl: 'xōchitl', breakdown: 'xō·chitl', translation: 'flower', note: 'x = /sh/' },
          { nahuatl: 'quēniuhqui', breakdown: 'quē·niuh·qui', translation: 'how / what is ... like?', note: 'qu = /k/, uh = /w/' },
          { nahuatl: 'cālli', breakdown: 'cā·lli', translation: 'house', note: 'c before a = /k/' },
        ],
      },
    ],
  },

  {
    id: 'orthographic-systems',
    title: 'Orthographic Systems: IDIEZ, INALI & SEP',
    nahuatlTitle: 'Tlahcuiloliztli',
    band: 'A1',
    shortDesc: 'Why Nahuatl is written three different ways, and why this course uses IDIEZ.',
    relatedUnits: [1],
    sections: [
      {
        kind: 'prose',
        text: `If you look up a Nahuatl word in three different books you may find it spelled three different ways: *cualli*, *kualli*, or *kuali*. All three refer to the same word ("good"). The difference isn't dialect — it's orthography. Nahuatl has never had a single official writing system, and several competing conventions coexist today.`,
      },
      {
        kind: 'rule',
        title: 'The three main systems',
        text: `• **IDIEZ** — the Instituto de Docencia e Investigación Etnológica de Zacatecas standard. Based on colonial conventions (written by Franciscan friars from the 1500s on) with modern refinements: macron vowels (ā ē ī ō) mark phonemic length, "h" marks the saltillo (glottal stop), "c"/"qu" for /k/, "hu"/"uh" for /w/, "cu"/"uc" for /kw/, "x" for /ʃ/, and the characteristic digraph "tl". Strong academic presence — the Hodgin dictionary, Sullivan's chrestomathies, and most recent linguistic work use IDIEZ.\n\n• **INALI** — Mexico's Instituto Nacional de Lenguas Indígenas (2003 – present) promotes a phonemic, Spanish-independent spelling: "k" for /k/, "w" for /w/, "s" for /s/, "kw" for /kw/, no macrons, saltillo marked with "j" or "h". Widely used in state schools and INALI publications.\n\n• **SEP / traditional** — older Secretaría de Educación Pública textbooks and many speakers use an intermediate system mixing Spanish spellings without macrons: "c" and "qu" for /k/, "hu" and "u" for /w/, no diacritics for length. Common in community-produced materials.`,
      },
      {
        kind: 'paradigm',
        heading: 'Same word, three spellings',
        caption: 'Rows show how a single EHN word is written in each system.',
        headers: ['IDIEZ (this course)', 'INALI', 'SEP / traditional'],
        rows: [
          { person: 'cualli', form: 'kuali', gloss: 'cualli' },
          { person: 'quēmman', form: 'kemah', gloss: 'queman' },
          { person: 'cihuātl', form: 'siwatl', gloss: 'cihuatl' },
          { person: 'xōchitl', form: 'xochitl', gloss: 'xochitl' },
          { person: 'tlahtoa', form: 'tlajtoa', gloss: 'tlahtoa' },
          { person: 'cuahuitl', form: 'kwawitl', gloss: 'cuahuitl' },
          { person: 'ahsi', form: 'ahsi / asi', gloss: 'aci' },
        ],
      },
      {
        kind: 'prose',
        heading: 'Why this course uses IDIEZ',
        text: `Two reasons. First, IDIEZ is the dominant standard in academic and lexicographic work on Eastern Huasteca Nahuatl — if you continue your studies using dictionaries, chrestomathies, or the Huasteca Nahuatl Project's materials, you will be reading IDIEZ. Second, IDIEZ preserves vowel length (e.g. *cōātl* "snake" vs. *cōa* "gopher"), which is phonemic in EHN and which INALI discards. Losing that contrast creates ambiguities that an English-speaking learner will find hard to reconstruct.\n\nINALI spellings still appear in our data (and throughout the Mexican educational system). When you encounter a word like *kuali* on a learn card, the canonical IDIEZ form *cualli* is shown as the primary spelling with "also written: kuali" below it.`,
      },
      {
        kind: 'paradigm',
        heading: 'Quick conversion cheatsheet',
        caption: 'Mapping between this course (IDIEZ) and INALI.',
        headers: ['Sound', 'IDIEZ writes', 'INALI writes'],
        rows: [
          { person: '/k/ before a/o', form: 'c', gloss: 'k' },
          { person: '/k/ before e/i', form: 'qu', gloss: 'k' },
          { person: '/w/ before vowel', form: 'hu', gloss: 'w' },
          { person: '/w/ after vowel', form: 'uh', gloss: 'w' },
          { person: '/kw/', form: 'cu / uc', gloss: 'kw' },
          { person: '/s/', form: 'c / z', gloss: 's' },
          { person: '/ʃ/', form: 'x', gloss: 'x' },
          { person: '/ʔ/ (saltillo)', form: 'h', gloss: 'j or h' },
          { person: 'long vowel', form: 'ā ē ī ō', gloss: '(unmarked)' },
        ],
      },
    ],
  },

  {
    id: 'nouns',
    title: 'Nouns & Absolutive Suffixes',
    nahuatlTitle: 'Tlatōcaxtiliztli tlen ax quipiya ītecoh',
    band: 'A1',
    shortDesc: 'How EHN nouns are formed and made plural.',
    relatedUnits: [3, 9, 22],
    sections: [
      {
        kind: 'prose',
        text: `In EHN, every noun in its basic unpossessed form carries an "absolutive suffix." This suffix appears when the noun stands alone (not possessed by anyone). When a possessive prefix is added, the absolutive suffix drops off.`,
      },
      {
        kind: 'rule',
        title: 'The four absolutive suffixes',
        text: `• **-tl** — added after a final vowel: *ātl* (water), *cōātl* (snake)\n• **-tli** — added after most consonants: *cīntli* (corn ear), *āmoxtli* (book)\n• **-li** — added after a stem-final /l/: *cōmalli* (comal/griddle), *petlatli* (sleeping mat)... actually *petlatl*\n• **-n** — a small class of nouns: *āltepētl* (town/city, though this ends -tl)\n• **ø** — some nouns take no suffix: *nāhuatl*, *āxcan*\n\nIn practice, you learn the suffix as part of the word. The key rule: when you add a possessive prefix, the suffix disappears.`,
      },
      {
        kind: 'paradigm',
        heading: 'Common absolutive noun forms',
        headers: ['Noun (absolutive)', 'Meaning', 'Suffix type'],
        rows: [
          { person: 'ātl', form: 'water', gloss: '-tl (after vowel)' },
          { person: 'cōātl', form: 'snake', gloss: '-tl (after vowel)' },
          { person: 'cālli', form: 'house', gloss: '-li (stem: cāl-)' },
          { person: 'cōmalli', form: 'comal / cooking griddle', gloss: '-li (stem: cōmal-)' },
          { person: 'cīntli', form: 'ear of corn', gloss: '-tli (after consonant)' },
          { person: 'āmoxtli', form: 'book', gloss: '-tli (after consonant)' },
          { person: 'tequitl', form: 'work / task', gloss: '-tl (stem: tequi-)... actually ends in -l' },
          { person: 'xōchitl', form: 'flower', gloss: '-tl' },
          { person: 'cihuātl', form: 'woman', gloss: '-tl (after vowel)' },
          { person: 'piltsintli', form: 'child / little one', gloss: '-tli' },
        ],
      },
      {
        kind: 'rule',
        title: 'Forming the plural',
        text: `To make a noun plural, drop the absolutive suffix and add **-meh**. This applies to both animate and inanimate nouns.\n\nExamples:\n• cihuātl → cihuāmeh (woman → women)\n• mācēhualli → mācēhualmeh (indigenous person → indigenous people)\n• tepōztli → tepōzmeh (metal/machine → metals/machines)\n• cōmalli → comalmeh (comal → comales)\n\nFor animate nouns, an honorific plural **-tzitzin** can also be used (see the Diminutives & Honorifics lesson).`,
      },
      {
        kind: 'examples',
        heading: 'Examples in context',
        items: [
          {
            nahuatl: 'Cihuātl',
            breakdown: 'cihuā-tl',
            translation: 'She/he is a woman',
            note: 'ø subject prefix (3rd person) + noun as predicate',
          },
          {
            nahuatl: 'Cihuāmeh',
            breakdown: 'cihuā-meh',
            translation: 'They are women',
            note: 'Plural form; absolutive suffix replaced by -meh',
          },
          {
            nahuatl: 'Mācēhualmeh',
            breakdown: 'mācēhual-meh',
            translation: 'They are indigenous people',
            note: '-li suffix drops; -meh added',
          },
          {
            nahuatl: 'Pan tomīllah ticcuahcuepaāh etl huan chilli huan cīntli.',
            breakdown: 'Pan to·mīllah ti·c·cuahcuepāh etl huan chilli huan cīntli.',
            translation: 'In our milpa we cultivate bean, chili, and corn.',
            note: 'etl, chilli, cīntli are all absolutive nouns as direct objects',
          },
        ],
      },
    ],
  },

  {
    id: 'subject-marking',
    title: 'Pronouns & Subject Marking',
    nahuatlTitle: 'Tlatzinpeuhcayōtl',
    band: 'A1',
    shortDesc: 'Personal pronouns and the subject prefixes attached to verbs.',
    relatedUnits: [3, 6, 11],
    sections: [
      {
        kind: 'prose',
        text: `EHN does not require an independent pronoun to be stated — the verb itself carries all the information about who is performing the action. Subject prefixes are attached directly to the front of the verb. The independent pronouns exist but are used mainly for emphasis or contrast.\n\n**Short vs. long forms.** In everyday EHN speech, the singular pronouns are simply **na** (I), **ta** (you), **ya** (he/she). These are the forms you will hear most often and the ones returned by most Nahuatl dictionaries and translators. The longer forms **naha / taha / yaha** exist as emphatic variants (roughly "I myself," "you yourself"), and the Classical Central Nahuatl forms *nehhuatl / tehhuatl / yehhuatl* appear in older texts but are rare in spoken EHN. **Learn the short forms first.**`,
      },
      {
        kind: 'paradigm',
        heading: 'Independent pronouns',
        caption: 'Everyday EHN forms. Used mainly for emphasis; often omitted.',
        headers: ['Person', 'Pronoun', 'Meaning'],
        rows: [
          { person: '1sg', form: 'na', gloss: 'I' },
          { person: '2sg', form: 'ta', gloss: 'you (singular)' },
          { person: '3sg', form: 'ya', gloss: 'he / she / it' },
          { person: '1pl', form: 'tohuantin', gloss: 'we' },
          { person: '2pl', form: 'amohuantin', gloss: 'you (plural)' },
          { person: '3pl', form: 'yahuantin', gloss: 'they' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'Emphatic and Classical variants',
        caption: 'Use for "I myself" / "you yourself," or when reading older texts.',
        headers: ['Person', 'Emphatic EHN', 'Classical'],
        rows: [
          { person: '1sg', form: 'naha', gloss: 'nehhuatl' },
          { person: '2sg', form: 'taha', gloss: 'tehhuatl' },
          { person: '3sg', form: 'yaha', gloss: 'yehhuatl' },
          { person: '1pl', form: 'tohuanti / tohhuantin', gloss: 'tehhuantin' },
          { person: '2pl', form: 'amohuanti', gloss: 'amehhuantin' },
          { person: '3pl', form: 'yahuanti', gloss: 'yehhuantin' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'Subject prefixes on verbs',
        caption: 'Using tequiti (to work) as the model verb.',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: '1sg', form: 'ni·tequiti', gloss: 'I work' },
          { person: '2sg', form: 'ti·tequiti', gloss: 'you work' },
          { person: '3sg', form: 'tequiti', gloss: 'he/she/it works (no prefix)' },
          { person: '1pl', form: 'ti·tequiti·h', gloss: 'we work' },
          { person: '2pl', form: 'an·tequiti·h', gloss: 'you all work' },
          { person: '3pl', form: 'tequiti·h', gloss: 'they work' },
        ],
      },
      {
        kind: 'rule',
        title: 'Key pattern: ni- / ti- / (ø) / ti-...-h / an-...-h / (ø)-...-h',
        text: `1st and 2nd person singular are marked by a prefix only (ni-, ti-).\n3rd person singular has no prefix.\nPlural forms add the suffix **-h** in addition to the prefix (for 1pl/2pl) or the suffix alone (3pl).\n\n1pl and 2sg share the prefix **ti-**. Context and the plural suffix -h distinguish them:\n• ti·tequiti = you work (2sg, no -h)\n• ti·tequiti·h = we work (1pl, has -h)`,
      },
      {
        kind: 'paradigm',
        heading: 'Noun predicates (equative sentences: "X is Y")',
        caption: 'Using cihuātl (woman) and mācēhualli (indigenous person).',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: '1sg', form: 'ni·cihuātl', gloss: 'I am a woman' },
          { person: '2sg', form: 'ti·cihuātl', gloss: 'you are a woman' },
          { person: '3sg', form: 'cihuātl', gloss: 'he/she is a woman' },
          { person: '1pl', form: 'ti·cihuāmeh', gloss: 'we are women' },
          { person: '2pl', form: 'in·cihuāmeh', gloss: 'you all are women' },
          { person: '3pl', form: 'cihuāmeh', gloss: 'they are women' },
        ],
      },
      {
        kind: 'examples',
        heading: 'Examples from dialogues',
        items: [
          {
            nahuatl: 'Na notōcah Paty.',
            breakdown: 'Na no·tōcah Paty.',
            translation: 'My name is Paty.',
            note: 'na = I (pronoun for emphasis); notōcah = my name',
          },
          {
            nahuatl: '¿Huan ta, quēniuhqui motōcah?',
            breakdown: '¿Huan ta, quēniuhqui mo·tōcah?',
            translation: 'And you, what is your name?',
            note: 'ta = you (emphatic); huan = and; mo- = your (2sg possessive)',
          },
          {
            nahuatl: 'Na niēhua Tecomate, Chicōntepēc.',
            breakdown: 'Na ni·ēhua Tecomate, Chicōntepēc.',
            translation: 'I am from Tecomate, Chicontepec.',
            note: 'ni- = 1sg subject prefix; ēhua = to be from / to depart',
          },
          {
            nahuatl: 'Na nimomachtia huan nitlamachtia.',
            breakdown: 'Na ni·momachtia huan ni·tlamachtia.',
            translation: 'I am a student and I teach.',
            note: 'ni- appears on each verb in the sentence',
          },
          {
            nahuatl: 'Ya tequiti pan mīllah.',
            breakdown: 'Ya tequiti pan mīllah.',
            translation: 'He / she works in the milpa.',
            note: 'ya = he/she (3sg pronoun); 3sg verb has no prefix',
          },
          {
            nahuatl: 'Nimācēhualli.',
            breakdown: 'Ni·mācēhualli.',
            translation: 'I am indigenous.',
            note: 'Equative: ni- + noun predicate (no "to be" verb needed)',
          },
          {
            nahuatl: 'Āmo, āxcan ninēhnemi pan āltepētl.',
            breakdown: 'Āmo, āxcan ni·nēhnemi pan āltepētl.',
            translation: 'No, today I am walking around town.',
            note: 'Āmo = no; āxcan = today/now; ninēhnemi = I walk around (ni- prefix)',
          },
        ],
      },
    ],
  },

  {
    id: 'present-tense',
    title: 'Present Tense Verbs',
    nahuatlTitle: 'Tlachīhualiztli tlen ax quimānēxtia cē tlamantli',
    band: 'A1',
    shortDesc: 'Intransitive verbs in the present tense with full conjugation.',
    relatedUnits: [6, 3, 11],
    sections: [
      {
        kind: 'prose',
        text: `Intransitive verbs are verbs that don't take a direct object — "to sleep," "to work," "to walk." In EHN, they're formed by attaching the appropriate subject prefix directly to the verb stem. There is no separate "to be" verb like Spanish "estar/ser"; the subject prefix alone carries that information.`,
      },
      {
        kind: 'rule',
        title: 'Structure: [subject prefix] + [verb stem]',
        text: `The verb stem is the core of the word. In dictionary entries, verbs are often listed without the prefix. To conjugate, simply attach the correct prefix:\n\n• 1sg: **ni-** + stem\n• 2sg: **ti-** + stem\n• 3sg: stem alone\n• 1pl: **ti-** + stem + **-h**\n• 2pl: **an-** + stem + **-h**\n• 3pl: stem + **-h**`,
      },
      {
        kind: 'paradigm',
        heading: 'Full conjugation — tequiti (to work)',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: '1sg', form: 'nitequiti', gloss: 'I work' },
          { person: '2sg', form: 'titequiti', gloss: 'you work' },
          { person: '3sg', form: 'tequiti', gloss: 'he / she / it works' },
          { person: '1pl', form: 'titequitih', gloss: 'we work' },
          { person: '2pl', form: 'antequitih', gloss: 'you all work' },
          { person: '3pl', form: 'tequitih', gloss: 'they work' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'Common intransitive verbs (1sg form)',
        headers: ['1sg form', 'Stem', 'Meaning'],
        rows: [
          { person: 'nitequiti', form: 'tequiti', gloss: 'I work' },
          { person: 'nimomachtia', form: 'momachtia', gloss: 'I study / I learn' },
          { person: 'nitlamachtia', form: 'tlamachtia', gloss: 'I teach' },
          { person: 'niēhua', form: 'ēhua', gloss: 'I am from / I depart' },
          { person: 'ninēhnemi', form: 'nēhnemi', gloss: 'I walk around' },
          { person: 'nicōchi', form: 'cōchi', gloss: 'I sleep' },
          { person: 'nimāltia', form: 'māltia', gloss: 'I bathe' },
          { person: 'niyāuh', form: 'yāuh', gloss: 'I go' },
          { person: 'nihuāllāuh', form: 'huāllāuh', gloss: 'I come' },
          { person: 'niātli', form: 'ātli', gloss: 'I drink water' },
        ],
      },
      {
        kind: 'examples',
        heading: 'Examples from dialogues',
        items: [
          {
            nahuatl: '¿Cāmpa tiyāuh?',
            breakdown: '¿Cāmpa ti·yāuh?',
            translation: 'Where are you going?',
            note: 'cāmpa = where (direction); ti- = 2sg; yāuh = to go',
          },
          {
            nahuatl: 'Niyāuh tiānquiz.',
            breakdown: 'Ni·yāuh tiānquiz.',
            translation: 'I am going to the market.',
            note: 'ni- = 1sg; tiānquiz = market',
          },
          {
            nahuatl: 'Nitlamachtia nāhuatl pan caltlamachticān.',
            breakdown: 'Ni·tlamachtia nāhuatl pan caltlamachticān.',
            translation: 'I teach Nahuatl at school.',
            note: 'tlamachtia is an intransitive form here (general teaching)',
          },
          {
            nahuatl: 'Āxcan ninēhnemi pan āltepētl.',
            breakdown: 'Āxcan ni·nēhnemi pan āltepētl.',
            translation: 'Today I am walking around town.',
            note: 'āxcan = today/now; pan = in/at',
          },
          {
            nahuatl: 'Achtohui nitlamachtia, nouhquiya nitequiti pan mīllah.',
            breakdown: 'Achtohui ni·tlamachtia, nouhquiya ni·tequiti pan mīllah.',
            translation: 'First I teach; then I also work in the milpa.',
            note: 'achtohui = first; nouhquiya = also / then; mīllah = in the milpa',
          },
        ],
      },
    ],
  },

  {
    id: 'possession',
    title: 'Possessive Prefixes',
    nahuatlTitle: 'Noyōllo — Motocaxtilli tlen quipoz ītecoh',
    band: 'A1',
    shortDesc: 'How to express "my," "your," "his/her," etc. on nouns.',
    relatedUnits: [8, 9, 22],
    sections: [
      {
        kind: 'prose',
        text: `To say "my house," "your name," or "their milpa," EHN adds a possessive prefix to the noun. At the same time, the absolutive suffix (-tl, -tli, -li) is dropped. This is one of the most important patterns in EHN — once you know the six possessive prefixes, you can form hundreds of possessed noun phrases.`,
      },
      {
        kind: 'paradigm',
        heading: 'Possessive prefixes',
        headers: ['Person', 'Prefix', 'Meaning'],
        rows: [
          { person: '1sg', form: 'no-', gloss: 'my' },
          { person: '2sg', form: 'mo-', gloss: 'your (singular)' },
          { person: '3sg', form: 'ī-', gloss: 'his / her / its' },
          { person: '1pl', form: 'to-', gloss: 'our' },
          { person: '2pl', form: 'amo-', gloss: 'your (plural)' },
          { person: '3pl', form: 'in-', gloss: 'their' },
        ],
      },
      {
        kind: 'rule',
        title: 'Dropping the absolutive suffix',
        text: `When you add a possessive prefix, the noun loses its absolutive suffix:\n\n• tōcah (name) → no·tōcah (my name), mo·tōcah (your name), ī·tōcah (his/her name)\n• mīllah (milpa/field) → no·mīllah (my milpa), to·mīllah (our milpa)\n• chichi (dog) → no·chichi (my dog), ī·chichi (his/her dog)\n\nFor nouns ending in -tl, the suffix often changes to **-uh** (possessive linker) when possessed:\n• tequitl → no·tequiuh (my work)\n• yōllo → no·yōllo (my heart) — stem yōll- + possessive form`,
      },
      {
        kind: 'paradigm',
        heading: 'tōcah (name) — full possessive paradigm',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: '1sg', form: 'notōcah', gloss: 'my name' },
          { person: '2sg', form: 'motōcah', gloss: 'your name' },
          { person: '3sg', form: 'ītōcah', gloss: 'his / her name' },
          { person: '1pl', form: 'totōcah', gloss: 'our name' },
          { person: '2pl', form: 'amotōcah', gloss: 'your (pl) name' },
          { person: '3pl', form: 'intōcah', gloss: 'their name' },
        ],
      },
      {
        kind: 'examples',
        heading: 'Examples from dialogues',
        items: [
          {
            nahuatl: '¿Quēniuhqui motōcah?',
            breakdown: '¿Quēniuhqui mo·tōcah?',
            translation: 'What is your name? (lit. "How is your name?")',
            note: 'mo- = your (2sg possessive)',
          },
          {
            nahuatl: 'Na notōcah Paty.',
            breakdown: 'Na no·tōcah Paty.',
            translation: 'My name is Paty.',
            note: 'no- = my (1sg possessive)',
          },
          {
            nahuatl: 'Felipe yohui mīllah huanya īchichi.',
            breakdown: 'Felipe yohui mīllah huanya ī·chichi.',
            translation: 'Felipe goes to the milpa with his dog.',
            note: 'ī- = his (3sg); chichi = dog (no absolutive suffix when possessed)',
          },
          {
            nahuatl: 'Pan tomīllah ticcuahcuepaāh etl huan chilli.',
            breakdown: 'Pan to·mīllah ti·c·cuahcuepāh etl huan chilli.',
            translation: 'In our milpa we cultivate bean and chili.',
            note: 'to- = our (1pl possessive); mīllah = milpa/field',
          },
          {
            nahuatl: 'Nopa noaxca, nicān niccāhua.',
            breakdown: 'Nopa no·axca, nicān ni·c·cāhua.',
            translation: 'That is mine; I leave it here.',
            note: 'noaxca = my possession/mine; no- = 1sg possessive',
          },
          {
            nahuatl: 'Neca iaxca nocniuh.',
            breakdown: 'Neca i·axca no·cniuh.',
            translation: 'That belongs to my friend.',
            note: 'iaxca = his/her possession; nocniuh = my friend (no- + cniuh)',
          },
        ],
      },
    ],
  },

  {
    id: 'questions',
    title: 'Question Words',
    nahuatlTitle: 'Tlahtlaniliztli',
    band: 'A1',
    shortDesc: 'How to ask who, what, where, when, how, and how many.',
    relatedUnits: [2, 3, 7],
    sections: [
      {
        kind: 'prose',
        text: `EHN has a rich set of question words. Like in Spanish, questions are typically marked with an inverted question mark at the start (¿) and a regular question mark at the end (?). The question word usually comes at the beginning of the sentence.`,
      },
      {
        kind: 'paradigm',
        heading: 'Core question words',
        headers: ['Question word', 'Meaning', 'Used to ask about…'],
        rows: [
          { person: '¿Tlen? / ¿Tlein?', form: 'What?', gloss: 'things, actions, identity' },
          { person: '¿Akin?', form: 'Who?', gloss: 'people, subjects' },
          { person: '¿Cānin? / ¿Cāmpa?', form: 'Where?', gloss: 'location (cānin = where is; cāmpa = where to/from)' },
          { person: '¿Quēniuhqui?', form: 'How? / What is … like?', gloss: 'manner, description' },
          { person: '¿Quēmman?', form: 'When?', gloss: 'time' },
          { person: '¿Quezqui?', form: 'How many?', gloss: 'quantity' },
          { person: '¿Quēn?', form: 'How? (shortened)', gloss: 'manner (informal)' },
        ],
      },
      {
        kind: 'rule',
        title: 'Using ¿Tlen? vs ¿Tlein?',
        text: `Both tlen and tlein mean "what." Tlen is the more common spoken form in EHN. Tlein is found more often in classical and written forms. Use tlen in conversation.\n\nTlen is also used as a relative pronoun meaning "that/which": *āmoxtli tlen nicāmati* (the book that I like).`,
      },
      {
        kind: 'examples',
        heading: 'Question patterns in context',
        items: [
          {
            nahuatl: '¿Quēniuhqui motōcah?',
            breakdown: '¿Quēniuhqui mo·tōcah?',
            translation: 'What is your name?',
            note: 'Literally: "How is your name?" — the standard greeting question',
          },
          {
            nahuatl: '¿Cānin tiēhua?',
            breakdown: '¿Cānin ti·ēhua?',
            translation: 'Where are you from?',
            note: 'cānin = where; tiēhua = you are from',
          },
          {
            nahuatl: '¿Cāmpa tiyāuh?',
            breakdown: '¿Cāmpa ti·yāuh?',
            translation: 'Where are you going?',
            note: 'cāmpa = where (direction/destination)',
          },
          {
            nahuatl: '¿Tlen ticchīhuaz mōztla?',
            breakdown: '¿Tlen ti·c·chīhuaz mōztla?',
            translation: 'What will you do tomorrow?',
            note: 'tlen = what; mōztla = tomorrow; -z = future suffix',
          },
          {
            nahuatl: '¿Quēmman tihuāllāz?',
            breakdown: '¿Quēmman ti·huāllāz?',
            translation: 'When will you come back?',
            note: 'quēmman = when; -z = future suffix',
          },
          {
            nahuatl: '¿Tlen ticchihua nicān?',
            breakdown: '¿Tlen ti·c·chihua nicān?',
            translation: 'What are you making here?',
            note: 'ticchihua = you make it (ti- = 2sg; c = object prefix "it"; chihua = to make)',
          },
          {
            nahuatl: '¿Quēn moxēloa tōnatiuh?',
            breakdown: '¿Quēn mo·xēloa tōnatiuh?',
            translation: 'How is the day divided up? (How does the sun move?)',
            note: 'Used to ask about time of day',
          },
        ],
      },
    ],
  },

  {
    id: 'future-tense',
    title: 'Future Tense',
    nahuatlTitle: 'Tlachīhualiztli tlen panoz',
    band: 'A1',
    shortDesc: 'Expressing future and indefinite actions with -z / -zqueh.',
    relatedUnits: [12, 7],
    sections: [
      {
        kind: 'prose',
        text: `The future tense in EHN is formed by adding a suffix to the present tense verb stem. This same suffix is also used for the "indefinite" tense — expressing habitual or general actions. The suffix changes slightly for plural forms.`,
      },
      {
        kind: 'rule',
        title: 'Future suffix: -z (singular) / -zqueh (plural)',
        text: `• Singular forms (1sg, 2sg, 3sg): add **-z** to the present stem\n• Plural forms (1pl, 2pl, 3pl): add **-zqueh** to the present stem\n\nNote: In the plural, the -h that normally marks plural verbs is already contained in -zqueh.`,
      },
      {
        kind: 'paradigm',
        heading: 'Future tense of tequiti (to work)',
        headers: ['Person', 'Future form', 'Meaning'],
        rows: [
          { person: '1sg', form: 'nitequitiz', gloss: 'I will work' },
          { person: '2sg', form: 'titequitiz', gloss: 'you will work' },
          { person: '3sg', form: 'tequitiz', gloss: 'he/she will work' },
          { person: '1pl', form: 'titequitizqueh', gloss: 'we will work' },
          { person: '2pl', form: 'antequitizqueh', gloss: 'you all will work' },
          { person: '3pl', form: 'tequitizqueh', gloss: 'they will work' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'Common verbs in the future (1sg form)',
        headers: ['Future form', 'Present form', 'Meaning'],
        rows: [
          { person: 'nimēhuaz', form: 'niēhua', gloss: 'I will get up / leave' },
          { person: 'nitlacuāz', form: 'nitlacua', gloss: 'I will eat' },
          { person: 'nimopatlaz', form: 'nimopātla', gloss: 'I will change' },
          { person: 'tiyāzceh', form: 'tiyāuh → 1pl', gloss: 'we will go' },
          { person: 'nihuāllāz', form: 'nihuāllāuh', gloss: 'I will come back' },
          { person: 'nitlahtōz', form: 'nitlahtoa', gloss: 'I will speak' },
          { person: 'nitlahcuilōz', form: 'nitlahcuiloa', gloss: 'I will write' },
          { person: 'nimomachtiznequi', form: 'nimomachtia', gloss: 'I want to learn (with nequi = to want)' },
        ],
      },
      {
        kind: 'examples',
        heading: 'Future tense in dialogue',
        items: [
          {
            nahuatl: 'Tiotlac nihuāllāz.',
            breakdown: 'Tiotlac ni·huāllāz.',
            translation: "I'll come back in the evening.",
            note: 'tiotlac = evening/afternoon; nihuāllāz = 1sg future of huāllāuh (to come)',
          },
          {
            nahuatl: '¿Quēmman tihuāllāz?',
            breakdown: '¿Quēmman ti·huāllāz?',
            translation: 'When will you come back?',
            note: '2sg future',
          },
          {
            nahuatl: 'Mōztla nitlahtōz nāhuatl īca nocihuāuh.',
            breakdown: 'Mōztla ni·tlahtōz nāhuatl īca no·cihuāuh.',
            translation: 'Tomorrow I will speak Nahuatl with my wife.',
            note: 'mōztla = tomorrow; nocihuāuh = my wife (no- possessive)',
          },
          {
            nahuatl: '¿Tlen ticchīhuaz mōztla?',
            breakdown: '¿Tlen ti·c·chīhuaz mōztla?',
            translation: 'What will you do tomorrow?',
            note: 'ticchīhuaz = you will do/make it (2sg future of chihua)',
          },
          {
            nahuatl: 'Na nitlahcuilōz pan caltlamachticān.',
            breakdown: 'Na ni·tlahcuilōz pan caltlamachticān.',
            translation: 'I will write at school.',
            note: 'nitlahcuilōz = 1sg future; caltlamachticān = school',
          },
          {
            nahuatl: 'Mōztla īcā yāhuatzinco nimēhuaz nitlacuāz huan nimopatlaz.',
            breakdown: 'Mōztla īcā yāhuatzinco ni·mēhuaz ni·tlacuāz huan ni·mopatlaz.',
            translation: 'Tomorrow at dawn I will get up, eat, and get dressed.',
            note: 'Multiple future verbs in one sentence; yāhuatzinco = at dawn',
          },
        ],
      },
    ],
  },

  {
    id: 'transitive-verbs',
    title: 'Transitive Verbs & Object Prefixes',
    nahuatlTitle: 'Tlachīhualiztli tlen quimānēxtia ācquiya quīchihua cē tlamantli',
    band: 'A1',
    shortDesc: 'How to mark direct objects on transitive verbs.',
    relatedUnits: [13, 18, 3],
    sections: [
      {
        kind: 'prose',
        text: `Transitive verbs take a direct object: "I eat the tortilla," "she takes the book." In EHN, the object is marked by a prefix that appears between the subject prefix and the verb stem. Both the subject AND the object are marked on the verb.`,
      },
      {
        kind: 'rule',
        title: 'Word order for transitive verbs',
        text: `The structure is: **[subject prefix] + [object prefix] + [verb stem]**\n\nFor example:\n• ni· + c· + cua = niccua (I eat it)\n• ti· + c· + cua = ticcua (you eat it)\n• qui· + cua = quicua (he/she eats it)\n\nThe object prefix *c-/qui-* means "it/him/her" (3rd person singular object). It has two forms: **c-** before consonants (but merges into **nic-** when ni+ c), and **qui-** elsewhere.`,
      },
      {
        kind: 'paradigm',
        heading: 'Object prefixes (what/who receives the action)',
        headers: ['Object prefix', 'Meaning', 'Example with cua (to eat)'],
        rows: [
          { person: 'nēch-', form: 'me', gloss: 'nēchmāca — he gives me (something)' },
          { person: 'mitz-', form: 'you (sg)', gloss: 'mitztemoa — I look for you' },
          { person: 'qui- / c-', form: 'him / her / it', gloss: 'quicua — he/she eats it; niccua — I eat it' },
          { person: 'tech-', form: 'us', gloss: 'tēchmāca — he/she gives us' },
          { person: 'amēch-', form: 'you all', gloss: 'amēchmāca — he/she gives you all' },
          { person: 'quin-', form: 'them', gloss: 'quinmāca — he/she gives them' },
        ],
      },
      {
        kind: 'rule',
        title: 'Combining subject + object prefixes',
        text: `When subject and object prefixes combine, contractions can occur:\n• ni- + c- → **nic-** (I + it): niccua (I eat it), nicāmati (I like it)\n• ti- + c- → **tic-**: ticcua (you eat it), tictlahtoa (you speak it)\n• ti- + c- + ... + -h (1pl) → **ticc-**: ticcuahcuepaāh (we cultivate it)\n\nWhen the subject is 3rd person and the object is 3rd person:\n• ø + qui- → **qui-**: quicua (he/she eats it), quichīhua (he/she makes it)\n• ø + qui- + -h → **quin-**: quincua (they eat them)... actually quincuah or quicuah`,
      },
      {
        kind: 'paradigm',
        heading: 'cua (to eat) — 3sg object, all subjects',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: '1sg', form: 'niccua', gloss: 'I eat it' },
          { person: '2sg', form: 'ticcua', gloss: 'you eat it' },
          { person: '3sg', form: 'quicua', gloss: 'he/she eats it' },
          { person: '1pl', form: 'ticcuah', gloss: 'we eat it' },
          { person: '3pl', form: 'quicuah', gloss: 'they eat it' },
        ],
      },
      {
        kind: 'examples',
        heading: 'Transitive verbs in context',
        items: [
          {
            nahuatl: 'Niccua tōmātl huan etl.',
            breakdown: 'Ni·c·cua tōmātl huan etl.',
            translation: 'I am eating tomato and bean.',
            note: 'nic- = ni (1sg) + c (3sg object "it"); tōmātl = tomato',
          },
          {
            nahuatl: '¿Huan ta, tlen ticcua?',
            breakdown: '¿Huan ta, tlen ti·c·cua?',
            translation: 'And you, what are you eating?',
            note: 'ticcua = ti (2sg) + c (3sg obj) + cua; tlen = what',
          },
          {
            nahuatl: 'Nictlaxcaloa.',
            breakdown: 'Ni·c·tlaxcaloa.',
            translation: 'I am making tortillas.',
            note: 'nic- = I + it; tlaxcaloa = to make tortillas',
          },
          {
            nahuatl: 'Nicnequi niccua tamalli āxcan.',
            breakdown: 'Ni·c·nequi ni·c·cua tamalli āxcan.',
            translation: 'I want to eat tamales today.',
            note: 'nicnequi = I want it; niccua = I eat it; two transitive verbs',
          },
          {
            nahuatl: 'Nonanān tēchmāca cafen yāhuatzinco.',
            breakdown: 'No·nanān tēch·māca cafen yāhuatzinco.',
            translation: 'My mother gives us coffee in the morning.',
            note: 'tēch- = us (1pl object); māca = to give; nonanān = my mother',
          },
          {
            nahuatl: 'Nopa noaxca, nicān niccāhua.',
            breakdown: 'Nopa no·axca, nicān ni·c·cāhua.',
            translation: "That's mine; I leave it here.",
            note: 'niccāhua = ni (1sg) + c (it) + cāhua (to leave/put down)',
          },
        ],
      },
    ],
  },

  {
    id: 'past-tense',
    title: 'Past Tense',
    nahuatlTitle: 'Tlachīhualiztli tlen panoc',
    band: 'A2',
    shortDesc: 'Expressing completed past actions with the perfective prefix ō-.',
    relatedUnits: [14, 15, 16],
    sections: [
      {
        kind: 'prose',
        text: `The past tense in EHN marks actions that were completed — similar to the Spanish preterite. It is formed by two changes: (1) adding the perfective prefix **ō-** at the very front of the verb, and (2) changing the verb stem to its perfective (past) form, which usually ends in **-c** for singular or **-queh** for plural.`,
      },
      {
        kind: 'rule',
        title: 'Structure: ō- + [subject prefix] + [past stem] + (-queh for plural)',
        text: `The prefix **ō-** is the main past tense marker. It appears before the subject prefix:\n\n• ō·ni·huetz = I fell (ō + ni + huetz-c, where -c is realized as final consonant change)\n• ō·ti·momāuh = you were hurt / scared\n• ō·ni·cuēp = I came back\n\nThe verb stem changes in the past: for many verbs, the final vowel is dropped and **-c** is added. Some verbs are irregular.`,
      },
      {
        kind: 'paradigm',
        heading: 'Past tense examples — huetz (to fall)',
        headers: ['Person', 'Past form', 'Meaning'],
        rows: [
          { person: '1sg', form: 'ōnihuetz', gloss: 'I fell' },
          { person: '2sg', form: 'ōtihuetz', gloss: 'you fell' },
          { person: '3sg', form: 'ōhuetz', gloss: 'he/she fell' },
          { person: '1pl', form: 'ōtihuetzqueh', gloss: 'we fell' },
          { person: '3pl', form: 'ōhuetzqueh', gloss: 'they fell' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'Common verbs in the past tense',
        headers: ['Past form', 'Infinitive / stem', 'Meaning'],
        rows: [
          { person: 'ōnihuetz', form: 'huetzi (to fall)', gloss: 'I fell' },
          { person: 'ōnicuēp', form: 'cuēpa (to return)', gloss: 'I came back / returned' },
          { person: 'ōniihhuia', form: 'yāuh → iihua? (to go)', gloss: 'I had gone' },
          { person: 'ōniccuac', form: 'cua (to eat)', gloss: 'I ate it' },
          { person: 'ōnimomāuh', form: 'momāua (to be scared/hurt)', gloss: 'I was scared / hurt' },
          { person: 'ōmochiuh', form: 'chihua (to happen/do)', gloss: 'it happened' },
          { person: 'ōniquicōhuac', form: 'cōhua (to buy)', gloss: 'I bought it' },
        ],
      },
      {
        kind: 'examples',
        heading: 'Past tense in dialogue',
        items: [
          {
            nahuatl: 'Āmo cuālli. Ōnihuetz pan ohtli.',
            breakdown: 'Āmo cuālli. Ō·ni·huetz pan ohtli.',
            translation: 'Not good. I fell on the road.',
            note: 'ō- = past; ni- = 1sg; huetz = fell; ohtli = road',
          },
          {
            nahuatl: '¿Āmo ōtimomāuh?',
            breakdown: '¿Āmo ō·ti·momāuh?',
            translation: "Weren't you hurt?",
            note: 'ō- = past; ti- = 2sg; momāuh = passive form of māua (to hurt/frighten)',
          },
          {
            nahuatl: 'Āmo, ōnicuēp nicān.',
            breakdown: 'Āmo, ō·ni·cuēp nicān.',
            translation: 'No, I came back here.',
            note: 'ō- = past; ni- = 1sg; cuēp = returned',
          },
          {
            nahuatl: '¿Tlen ōmochiuh?',
            breakdown: '¿Tlen ō·mo·chiuh?',
            translation: 'What happened?',
            note: 'ō- = past; mo- = passive/reflexive; chiuh = made/happened (past of chihua)',
          },
          {
            nahuatl: 'Cuālli nicah āxcan.',
            breakdown: 'Cuālli ni·cah āxcan.',
            translation: "I'm fine now.",
            note: 'Present: no ō- prefix; āxcan = now',
          },
        ],
      },
    ],
  },

  {
    id: 'negation',
    title: 'Negation',
    nahuatlTitle: 'Ahīliztli',
    band: 'A1',
    shortDesc: 'How to say "no," "not," and "nothing" in EHN.',
    relatedUnits: [11, 18, 3],
    sections: [
      {
        kind: 'prose',
        text: `EHN has two main ways to negate: the word **āmo** (no / not), used before verbs and in simple denials, and the prefix **ax-** (not), attached directly to verbs. A stronger negation is **axcanah**, used for emphatic denial.`,
      },
      {
        kind: 'paradigm',
        heading: 'Negation forms',
        headers: ['Form', 'Usage', 'Example'],
        rows: [
          { person: 'āmo', form: 'no / not — before verbs', gloss: 'Āmo niccua. — I am not eating.' },
          { person: 'ax- (prefix)', form: 'not — attached to verb', gloss: "axnicān — not here; axquipiya — doesn't have it" },
          { person: 'axcanah', form: '"emphatic no" / "not at all"', gloss: 'Axcanah nihueliz. — I cannot.' },
          { person: 'āmo nelli', form: '"not true" / "that\'s not right"', gloss: 'Āmo nelli. — That\'s not true.' },
          { person: 'āx tle', form: 'nothing', gloss: 'Āx tle nicah. — I have nothing.' },
        ],
      },
      {
        kind: 'rule',
        title: 'āmo vs ax-',
        text: `• **āmo** stands as a separate word before a verb or noun. It is the most common negation: *Āmo niyāuh* (I'm not going), *Āmo cuālli* (not good).\n\n• **ax-** is a prefix attached directly to the verb or word it negates: *axnicān* (not here — from nicān), *axquipiya* (he/she doesn't have it). Less common in casual speech.\n\n• **axcanah** is used for stronger or more emphatic negation, including polite refusals.`,
      },
      {
        kind: 'examples',
        heading: 'Negation in context',
        items: [
          {
            nahuatl: 'Āmo, āxcan ninēhnemi pan āltepētl.',
            breakdown: 'Āmo, āxcan ni·nēhnemi pan āltepētl.',
            translation: 'No, today I am walking around town.',
            note: 'Āmo = "No" as a standalone denial',
          },
          {
            nahuatl: 'Āmo cuālli.',
            breakdown: 'Āmo cuālli.',
            translation: 'Not good.',
            note: 'Simple negation of an adjective',
          },
          {
            nahuatl: 'Niātli āmo niccua.',
            breakdown: 'Ni·ātli āmo ni·c·cua.',
            translation: "I'm drinking water, not eating.",
            note: 'āmo negates the second verb in the sequence',
          },
          {
            nahuatl: 'Neca iaxca nocniuh. Āmo toaxca.',
            breakdown: 'Neca i·axca no·cniuh. Āmo to·axca.',
            translation: "That belongs to my friend. It is not ours.",
            note: 'Āmo toaxca = literally "not our possession"',
          },
          {
            nahuatl: 'Āmo, ōnicuēp nicān. Cuālli nicah āxcan.',
            breakdown: 'Āmo, ō·ni·cuēp nicān. Cuālli ni·cah āxcan.',
            translation: "No, I came back here. I'm fine now.",
            note: 'Āmo as denial; then positive statement',
          },
        ],
      },
    ],
  },

  {
    id: 'diminutives',
    title: 'Diminutives & Honorifics',
    nahuatlTitle: 'Tlahtoltēcpānalitzli: -pil huan -tzin',
    band: 'A1',
    shortDesc: 'The suffixes -pil (small/dear) and -tzin (respectful/affectionate).',
    relatedUnits: [20, 9],
    sections: [
      {
        kind: 'prose',
        text: `Two of the most expressive features of EHN are the diminutive suffix **-pil** and the honorific/affective suffix **-tzin**. These can be added to nouns, verbs, names, and even pronouns. Mastering them gives your speech warmth, nuance, and cultural authenticity.`,
      },
      {
        kind: 'rule',
        title: '-pil: smallness, affection, and belittling',
        text: `The suffix **-pil** (also seen as **-pil-** before other suffixes) expresses:\n1. **Smallness**: *calpil* (little house)\n2. **Affection**: *nopiltsin* (my dear child)\n3. **Diminution** of an abstract concept: *tlahtōlpil* (a little speech / a few words)\n\nWhen -pil is added, any absolutive suffix on the noun is usually dropped first.`,
      },
      {
        kind: 'rule',
        title: '-tzin: respect, reverence, and tender address',
        text: `The suffix **-tzin** (plural: **-tzitzin**) expresses:\n1. **Respect for others**: *nocihuātsin* (my respected wife)\n2. **Reverence** toward sacred or high-status beings: *tōnatiuhtsin* (the revered sun)\n3. **Tenderness** toward children or loved ones: *nopiltsin* (my dear little one)\n4. **Polite forms** of verbs and requests: *Ximoquētza!* → *Ximoquētzatsin!* (more polite)\n\n-tzin can combine with -pil: *-piltzin* (dear little one).`,
      },
      {
        kind: 'paradigm',
        heading: 'Examples of -pil and -tzin in use',
        headers: ['Form', 'Base word', 'Meaning'],
        rows: [
          { person: 'piltsintli', form: 'piltsin + tli (absolutive)', gloss: 'child / little one (noun)' },
          { person: 'nopiltsin', form: 'no- + pil + tzin', gloss: 'my dear child' },
          { person: 'notlamachtihtsin', form: 'no- + tlamachtih + tzin', gloss: 'my dear/respected teacher' },
          { person: 'tōnatiuhtsin', form: 'tōnatiuh + tzin', gloss: 'the revered sun' },
          { person: 'tlahtōlpil', form: 'tlahtōl + pil', gloss: 'a little speech / a few words' },
          { person: 'calpiltsin', form: 'cal + pil + tzin', gloss: 'dear little house' },
          { person: 'motōcatsin', form: 'mo- + tōca + tzin', gloss: 'your respected name' },
          { person: 'inintequiuhtsin', form: 'in- + in + tequiuh + tzin', gloss: 'their respected work/profession' },
        ],
      },
      {
        kind: 'rule',
        title: 'Plural of -tzin',
        text: `The plural of -tzin is -tzitzin. This is used for animate nouns (people, animals) when referring to multiple respected individuals:\n\n• *notlamachtihtsin* (my teacher) → *notlamachtihtzitzin* (my teachers)\n• *nopiltsin* (my child) → *nopiltzitzin* (my children)\n\nThe plural -tzitzin replaces -tzin, not just adds to it.`,
      },
      {
        kind: 'examples',
        heading: 'In context',
        items: [
          {
            nahuatl: 'Piyalli.',
            breakdown: 'Pi·ya·lli.',
            translation: 'Hello!',
            note: 'Piyalli is itself an affective greeting; used between friends and community members',
          },
          {
            nahuatl: 'Nopiltzitzin mohmōztlah yohuih caltlamachticān.',
            breakdown: 'No·pil·tzitzin mohmōztlah yohuih caltlamachticān.',
            translation: 'My children go to school every day.',
            note: '-tzitzin = honorific plural; mohmōztlah = every day',
          },
          {
            nahuatl: 'Cualtitoc, notlamachtihtsin.',
            breakdown: 'Cualtitoc, no·tlamachtih·tsin.',
            translation: 'Good day, my teacher.',
            note: '-tzin = respectful address to teacher',
          },
        ],
      },
    ],
  },

  {
    id: 'reflexives',
    title: 'Reflexive Verbs: mo- and ninno-',
    nahuatlTitle: 'Tlachīhualiztli tlen moquīxtia īpan nō yeh',
    band: 'A2',
    shortDesc: 'Verbs whose subject and object are the same person: "I wash myself," "she gets dressed."',
    relatedUnits: [10, 14, 26, 42],
    sections: [
      {
        kind: 'prose',
        text: `Reflexive verbs describe actions the subject performs on themselves: bathing, dressing, getting up, sitting down, learning (i.e. "teaching oneself"). In EHN, reflexives are formed by adding a **reflexive prefix** between the subject prefix and the verb stem. You already know many reflexives without realising it — *nimomachtia* "I study / I learn" is literally "I teach myself."`,
      },
      {
        kind: 'rule',
        title: 'The reflexive prefix position',
        text: `Structure: **[subject prefix] + [reflexive prefix] + [verb stem]**\n\nThe reflexive prefix slot sits where an object prefix would otherwise go. A verb cannot have both a reflexive prefix and a separate 3rd-person object prefix (qui-/c-) at the same time in this slot.`,
      },
      {
        kind: 'paradigm',
        heading: 'Reflexive prefixes by person',
        caption: 'The 3rd-person form mo- is also used for "one (impersonal)".',
        headers: ['Subject', 'Reflexive prefix', 'Meaning'],
        rows: [
          { person: '1sg',  form: 'nino- / nimo-', gloss: 'myself (nimo- is more common in EHN)' },
          { person: '2sg',  form: 'timo-',         gloss: 'yourself' },
          { person: '3sg',  form: 'mo-',           gloss: 'himself / herself / itself' },
          { person: '1pl',  form: 'timo- …-h',     gloss: 'ourselves (final -h marks plural)' },
          { person: '2pl',  form: 'anmo-',         gloss: 'yourselves' },
          { person: '3pl',  form: 'mo- …-h',       gloss: 'themselves' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'momachtia (to learn / study) fully conjugated',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: '1sg', form: 'nimomachtia',     gloss: 'I study / I am learning' },
          { person: '2sg', form: 'timomachtia',     gloss: 'you study' },
          { person: '3sg', form: 'momachtia',       gloss: 'he / she studies' },
          { person: '1pl', form: 'timomachtiah',    gloss: 'we study' },
          { person: '2pl', form: 'anmomachtiah',    gloss: 'you all study' },
          { person: '3pl', form: 'momachtiah',      gloss: 'they study' },
        ],
      },
      {
        kind: 'rule',
        title: 'Common reflexive verbs',
        text: `Many everyday actions in EHN are naturally reflexive:\n\n• **mōaltia** (mo- + āltia) — to bathe oneself\n• **mopatla** — to change (clothes); to exchange\n• **mēhua** (mo- + ēhua) — to get up / wake up\n• **mocēhuia** — to rest, to sit down\n• **motoca** — to bury oneself / to call oneself (as in "my name is…")\n• **momachtia** — to teach oneself → to study / learn\n• **momāuhtia** — to scare oneself → to be afraid\n• **motlaloa** — to run\n• **mocuepa** — to return / come back\n\nNotice that several of these have been introduced earlier as ordinary vocabulary. The mo- was always the reflexive prefix.`,
      },
      {
        kind: 'examples',
        heading: 'Reflexives in context',
        items: [
          {
            nahuatl: 'Mōztla īca yāhuatzinco nimēhuaz.',
            breakdown: 'Mōztla īca yāhuatzinco ni·m·ēhua·z.',
            translation: 'Tomorrow at dawn I will get up.',
            note: 'ni- (1sg) + m(o)- (refl.) + ēhua (to rise) + -z (future)',
          },
          {
            nahuatl: 'Nimōaltia huan nimopatla.',
            breakdown: 'Ni·m·ōaltia huan ni·mo·patla.',
            translation: 'I bathe and I get dressed / change clothes.',
            note: 'Two reflexive verbs in one sentence',
          },
          {
            nahuatl: '¿Quēniuhqui motōcah?',
            breakdown: '¿Quēniuhqui mo·tōca·h?',
            translation: 'What is your name? (lit. "How do you call yourself?")',
            note: 'mo- refl. on the verb tōca "to call / name"',
          },
          {
            nahuatl: 'Na nimomachtia Nāhuatl.',
            breakdown: 'Na ni·mo·machtia Nāhuatl.',
            translation: 'I am learning Nahuatl.',
            note: 'Literally: "I teach myself Nahuatl"',
          },
          {
            nahuatl: 'In piltzin motlaloa pan ohtli.',
            breakdown: 'In piltzin mo·tlaloa pan ohtli.',
            translation: 'The child is running on the road.',
            note: 'mo- + tlaloa (to run); no separate subject prefix needed for 3sg',
          },
          {
            nahuatl: 'Axcanah nimomāuhtia.',
            breakdown: 'Axcanah ni·mo·māuhtia.',
            translation: 'I am not afraid at all.',
            note: 'axcanah = emphatic "no"; momāuhtia = to frighten oneself = to be afraid',
          },
        ],
      },
      {
        kind: 'rule',
        title: 'Reflexive plus an object: -tla-',
        text: `When a reflexive verb also needs a generic object (e.g. "I wash [something]"), EHN uses the **tla-** indefinite object prefix. This slot comes after the reflexive prefix:\n\n• ni·**mo**·**tla**·paca = nimotlapaca = "I wash things for myself / I wash"\n• ti·**mo**·**tla**·chīhuilia = timotlachīhuilia = "you make things for yourself"\n\nYou will learn more about -tla- and -tē- in the "Object Markers" lesson.`,
      },
    ],
  },

  {
    id: 'applicatives-causatives',
    title: 'Applicatives & Causatives',
    nahuatlTitle: 'Tlachīhualiztli īhuān cē occē āquiya',
    band: 'B1',
    shortDesc: 'Deriving verbs with an added beneficiary (-lia) or a made-to-do meaning (-tia / -ltia).',
    relatedUnits: [12, 13, 26, 38, 42],
    sections: [
      {
        kind: 'prose',
        text: `EHN, like all Nahuatl varieties, lets you extend a verb by adding morphemes that change the number of participants in the action. Two of the most important are:\n\n• **Applicative** (-lia / -huia): adds a beneficiary or indirect object — "I cook (FOR someone)."\n• **Causative** (-tia / -ltia): adds a "maker" — "I make (someone) cook." The original subject becomes an object.\n\nOnce you know these, you can generate dozens of new verbs from stems you already know.`,
      },
      {
        kind: 'rule',
        title: 'The applicative -lia ("do-for-someone")',
        text: `The applicative suffix **-lia** is added to a verb stem and creates a version of the verb that takes one extra object — the beneficiary, the person the action is done for. The beneficiary is marked with an object prefix (nēch-, mitz-, etc.) on the front of the verb.\n\nFormation:\n• Verbs ending in a vowel: drop the final vowel, add -lia\n• Verbs ending in -oa: -oa → -alhuia\n• Verbs ending in -ia: -ia → -ilia\n\nExamples:\n• chīhua (to make) → chīhuilia (to make for): *Nēch·chīhuilia cē tlaxcalli.* = "She makes a tortilla for me."\n• cua (to eat) → cualia (to eat up at someone's expense): *Nēch·cualia notlacual.* = "He eats up my food on me."\n• tlahtoa (to speak) → tlahtalhuia (to speak to / on behalf of): *Mitz·tlahtalhuia.* = "He speaks on your behalf."`,
      },
      {
        kind: 'paradigm',
        heading: 'Applicatives in action',
        caption: 'Notice the object prefix marks the beneficiary, not the thing given/made.',
        headers: ['Base verb', 'Applicative', 'Example'],
        rows: [
          { person: 'chīhua (to make)',  form: 'chīhuilia',  gloss: 'nēchchīhuilia — s/he makes it for me' },
          { person: 'cōhua (to buy)',    form: 'cōhuilia',   gloss: 'mitzcōhuilia — s/he buys it for you' },
          { person: 'piqui (to wrap)',   form: 'piquilia',   gloss: 'nēchpiquilia — s/he wraps it for me' },
          { person: 'tlahcuiloa (to write)', form: 'tlahcuilhuia', gloss: 'nēchtlahcuilhuia — s/he writes to me' },
          { person: 'maca (to give)',    form: 'maquilia',   gloss: 'nēchmaquilia — s/he gives it to me (polite)' },
          { person: 'ihtoa (to say)',    form: 'ilhuia',     gloss: 'nēchilhuia — s/he says it to me / tells me' },
        ],
      },
      {
        kind: 'rule',
        title: 'The causative -tia / -ltia ("make-someone-do")',
        text: `The causative suffix turns an intransitive verb into a transitive one ("fall" → "make fall = drop"), or a transitive verb into a ditransitive one. The "maker" becomes the subject; the original subject becomes the object.\n\nFormation:\n• Verbs ending in -i: -i → -tia (miqui → miquitia "to kill"; tlacua → tlacualtia "to feed")\n• Verbs ending in -a: add -ltia or -tia depending on stem shape (patla → patlahtia, chōca → chōquiltia)\n• Verbs ending in -oa: -oa → -altia (tlahtoa → tlahtaltia)\n\nMany of the most common EHN transitive verbs are derived causatives:\n• **machtia** = "teach" ← *mati* (to know) + -tia → "make someone know"\n• **tlacualtia** = "feed" ← *tlacua* (to eat) + -ltia → "make someone eat"\n• **miquitia** = "kill" ← *miqui* (to die) + -tia → "make someone die"`,
      },
      {
        kind: 'examples',
        heading: 'Causatives in context',
        items: [
          {
            nahuatl: 'Nonanā nēchtlacualtia yāhuatzinco.',
            breakdown: 'No·nanā nēch·tlacual·tia yāhuatzinco.',
            translation: 'My mother feeds me in the morning.',
            note: 'tlacua (I eat) + -ltia (causative) = tlacualtia (feed); nēch- = me',
          },
          {
            nahuatl: 'Motahtzin mitzmachtia nāhuatl.',
            breakdown: 'Mo·tahtzin mitz·machtia nāhuatl.',
            translation: 'Your father teaches you Nahuatl.',
            note: 'mati (to know) + -tia = machtia (teach); the original knower becomes the object',
          },
          {
            nahuatl: 'Āxcan nitlaxcalchīhuilia nomonān.',
            breakdown: 'Āxcan ni·tlaxcal·chīhuilia no·monān.',
            translation: 'Today I am making tortillas for my mother-in-law.',
            note: 'chīhuilia = applicative of chīhua; the beneficiary is marked separately',
          },
          {
            nahuatl: 'Ōnēchcōhuilih cē āmoxtli.',
            breakdown: 'Ō·nēch·cōhuilih cē āmoxtli.',
            translation: 'S/he bought me a book.',
            note: 'Past (ō-) + nēch- (me) + cōhuilih (past of cōhuilia = applicative of "buy")',
          },
          {
            nahuatl: 'Ximonechilhui.',
            breakdown: 'Xi·mo·nech·ilhui.',
            translation: 'Tell me! (imperative)',
            note: 'xi- = imperative; mo- refl./applicative link; nēch- = me; ilhui = tell (applicative of ihtoa)',
          },
          {
            nahuatl: 'In tlamachtihquetl quinmachtia in piltzitzin.',
            breakdown: 'In tlamachtih·quetl quin·machtia in pil·tzitzin.',
            translation: 'The teacher teaches the children.',
            note: 'quin- = them (3pl obj); machtia = causative of mati',
          },
        ],
      },
      {
        kind: 'rule',
        title: 'Applicative and causative together',
        text: `Applicatives and causatives can stack. *Nēchtlacualtilia* = "s/he feeds it to me FOR someone else" = tlacua + -lti- (caus.) + -lia (appl.). Such forms are rare in conversation but common in narrative and ceremonial speech. Start by recognising the pieces one at a time.`,
      },
    ],
  },

  {
    id: 'imperatives',
    title: 'Commands & Requests (Imperative)',
    nahuatlTitle: 'Tlanahuatiliztli',
    band: 'A2',
    shortDesc: 'How to tell someone to do something — politely or directly — with xi-.',
    relatedUnits: [11, 13, 18, 26, 29],
    sections: [
      {
        kind: 'prose',
        text: `To give a command, make a polite request, or extend an invitation, EHN uses the **imperative prefix xi-** on the verb. The imperative replaces the usual subject prefix (ti-, an-) — you don't say both. Imperatives exist for 2sg ("do it!") and 2pl ("do it, all of you!"). There is also an optative form using **mā …-h** for "let X happen" or "may X do it".`,
      },
      {
        kind: 'rule',
        title: 'Basic imperative formation',
        text: `Singular imperative: **xi- + [verb stem]**\nPlural imperative: **xi- + [verb stem] + -cān**\n\nThe verb stem used is the short stem (usually the bare root with no final -a if the verb is -oa, dropped to -o). Many of these look identical to the 2sg present form with ti- swapped for xi-:\n\n• *titlacua* (you eat) → *xitlacua!* (eat!)\n• *ticcua tōmātl* (you eat tomato) → *xiccua tōmātl!* (eat the tomato!)\n• *tiyāuh* (you go) → *xiyāuh!* (go!) — irregular; also *xiyah* is heard`,
      },
      {
        kind: 'paradigm',
        heading: 'Imperative forms by verb',
        headers: ['Base verb', 'Imperative sg.', 'Imperative pl.'],
        rows: [
          { person: 'cua (to eat)',       form: 'xiccua!',      gloss: 'xiccuacān!' },
          { person: 'cōhua (to buy)',     form: 'xiccōhua!',    gloss: 'xiccōhuacān!' },
          { person: 'tlahtoa (to speak)', form: 'xitlahto!',    gloss: 'xitlahtocān!' },
          { person: 'chīhua (to do)',     form: 'xicchīhua!',   gloss: 'xicchīhuacān!' },
          { person: 'mocēhuia (to rest)', form: 'ximocēhui!',   gloss: 'ximocēhuicān!' },
          { person: 'mēhua (to get up)',  form: 'ximēhua!',     gloss: 'ximēhuacān!' },
          { person: 'huāllāuh (to come)', form: 'xihuāllā!',    gloss: 'xihuāllācān!' },
          { person: 'yāuh (to go)',       form: 'xiyāuh!',      gloss: 'xihuiyān!' },
        ],
      },
      {
        kind: 'rule',
        title: 'Softening a command: mā, mah, and xic-',
        text: `Three strategies soften an imperative into a polite request:\n\n1. **Add mā at the front.** *Mā xihuāllā* ("please come") is much gentler than bare *xihuāllā!*. Some EHN speakers use *mah* or *mā ximo-* for an even softer tone.\n\n2. **Use the honorific -tzin on the verb.** *Ximocēhuitzino!* ("please have a seat") combines imperative + reflexive + honorific.\n\n3. **Use the optative (3rd person).** *Mā huāllā* ("may he come / let him come") asks indirectly. Plural optative: *Mā huāllāh* with final -h.\n\nThese are the EHN equivalent of saying "please" and the social register of the request.`,
      },
      {
        kind: 'paradigm',
        heading: 'Optative (3rd-person wish) with mā',
        caption: 'Used for "may X do Y" / "let X happen" — no xi- prefix.',
        headers: ['Form', 'Meaning', 'Notes'],
        rows: [
          { person: 'mā cuālli pano',           form: 'may it go well',         gloss: 'common blessing' },
          { person: 'mā tihuālāh',              form: 'may we come / let us come', gloss: '1pl optative, -h plural marker' },
          { person: 'mā nicān cah',             form: 'let him/her be here',    gloss: '3sg optative with existential cah' },
          { person: 'mā Dios mitzpalehui',      form: 'may God help you',       gloss: 'formal/religious register' },
        ],
      },
      {
        kind: 'rule',
        title: 'Negative imperatives: āmo xi- or mahcamo xi-',
        text: `To tell someone NOT to do something, place **āmo** before the imperative:\n\n• *Āmo xicchīhua!* — Don't do it!\n• *Āmo ximoāltih!* — Don't bathe! (refl. imperative)\n\nFor a stronger or more formal prohibition, *mahcamo* or *macamō* is used, often in ritual or proverbial speech:\n\n• *Mahcamo xiyāuh pan cuauhtlah īca tlayohua.* — Do not go into the forest at night.`,
      },
      {
        kind: 'examples',
        heading: 'Imperatives in context',
        items: [
          {
            nahuatl: 'Xihuāllā!',
            breakdown: 'Xi·huāllā!',
            translation: 'Come!',
            note: 'xi- (imperative) + huāllā (short stem of huāllāuh)',
          },
          {
            nahuatl: 'Mā ximocēhui.',
            breakdown: 'Mā xi·mo·cēhui.',
            translation: 'Please have a seat / please rest.',
            note: 'mā softens the command; mocēhui is the reflexive verb "to rest"',
          },
          {
            nahuatl: 'Xinēchilhui.',
            breakdown: 'Xi·nēch·ilhui.',
            translation: 'Tell me.',
            note: 'xi- + nēch- (me, obj.) + ilhui (applicative of ihtoa "to say")',
          },
          {
            nahuatl: 'Xiccua tōmātl!',
            breakdown: 'Xi·c·cua tōmātl!',
            translation: 'Eat the tomato!',
            note: 'c- = 3sg object "it"; cua = eat',
          },
          {
            nahuatl: 'Āmo xichoca, piltzin.',
            breakdown: 'Āmo xi·choca, piltzin.',
            translation: "Don't cry, child.",
            note: 'Negative imperative with āmo',
          },
          {
            nahuatl: 'Xitlazohcāmatih!',
            breakdown: 'Xi·tlazohcāmati·h!',
            translation: 'Give thanks, all of you!',
            note: 'Plural imperative with final -h (a shortened form of -cān heard in EHN)',
          },
          {
            nahuatl: 'Mā tiyāzqueh.',
            breakdown: 'Mā ti·yāz·queh.',
            translation: "Let's go. / May we go.",
            note: 'mā + 1pl future = hortative "let us…"',
          },
        ],
      },
    ],
  },
];

export function getGrammarLesson(id: string): GrammarLesson | undefined {
  return GRAMMAR_LESSONS.find((l) => l.id === id);
}
