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
  relatedGrammarLabIds?: string[];
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
    relatedGrammarLabIds: ['noun-stems-absolutives', 'noun-predicates-no-copula'],
    sections: [
      {
        kind: 'prose',
        text: `In EHN, many nouns in their basic unpossessed form carry an "absolutive suffix." This suffix appears when the noun stands alone (not possessed by anyone). When a possessive prefix is added, the absolutive ending often drops or changes in a learned possessed form.`,
      },
      {
        kind: 'rule',
        title: 'The four absolutive suffixes',
        text: `• **-tl** — common after a final vowel: *ātl* (water), *cōātl* (snake)\n• **-tli** — common after many consonants: *cīntli* (corn ear), *āmoxtli* (book)\n• **-li** — common after a stem-final /l/: *cōmalli* (comal/griddle), *calli* (house)\n• **-n** — appears in a smaller set of nouns; learn these forms individually\n• **ø** — some nouns take no visible suffix: *nāhuatl*, *āxcan*\n\nIn practice, learn the suffix as part of the word. For beginner production, use explicit possessed forms shown in the course rather than guessing from a new noun.`,
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
          { person: 'tequitl', form: 'work / task', gloss: 'learn the possessed form explicitly' },
          { person: 'xōchitl', form: 'flower', gloss: '-tl' },
          { person: 'cihuātl', form: 'woman', gloss: '-tl (after vowel)' },
          { person: 'piltsintli', form: 'child / little one', gloss: '-tli' },
        ],
      },
      {
        kind: 'rule',
        title: 'Forming the plural',
        text: `For beginner production, first learn the animate plural pattern: many animate nouns drop the absolutive ending and add **-meh**.\n\nExamples:\n• cihuātl → cihuāmeh (woman → women)\n• mācēhualli → mācēhualmeh (Indigenous person → Indigenous people)\n\nInanimate nouns often do not require plural marking in ordinary use, though usage varies. For animate nouns, an honorific plural **-tzitzin** can also be used (see the Diminutives & Honorifics lesson).`,
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
    relatedGrammarLabIds: ['subject-prefixes', 'noun-predicates-no-copula'],
    sections: [
      {
        kind: 'prose',
        text: `EHN does not require an independent pronoun to be stated — the verb itself carries all the information about who is performing the action. Subject prefixes are attached directly to the front of the verb. The independent pronouns exist but are used mainly for emphasis or contrast.\n\n**Short vs. long forms.** In everyday EHN speech, the singular pronouns are simply **na** (I), **ta** (you), **ya** (he/she). These are the forms you will hear most often and the ones returned by most Nahuatl dictionaries and translators. The longer forms **naha / taha / yaha** exist as emphatic variants (roughly "I myself," "you yourself"), and the Classical Central Nahuatl forms *nehhuatl / tehhuatl / yehhuatl* appear in older texts but are rare in spoken EHN. **Learn the short forms first.**\n\nNew to grammar terms like "first person" and "third person plural"? See the "Who's Talking? Person & Number Explained" lesson for a plain-English guide.`,
      },
      {
        kind: 'paradigm',
        heading: 'Independent pronouns',
        caption: 'Everyday EHN forms. Used mainly for emphasis; often omitted.',
        headers: ['Person', 'Pronoun', 'Meaning'],
        rows: [
          { person: 'I', form: 'na', gloss: 'I' },
          { person: 'you', form: 'ta', gloss: 'you (singular)' },
          { person: 'he / she', form: 'ya', gloss: 'he / she / it' },
          { person: 'we', form: 'tohuantin', gloss: 'we' },
          { person: 'you all', form: 'amohuantin', gloss: 'you (plural)' },
          { person: 'they', form: 'yahuantin', gloss: 'they' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'Emphatic and Classical variants',
        caption: 'Use for "I myself" / "you yourself," or when reading older texts.',
        headers: ['Person', 'Emphatic EHN', 'Classical'],
        rows: [
          { person: 'I', form: 'naha', gloss: 'nehhuatl' },
          { person: 'you', form: 'taha', gloss: 'tehhuatl' },
          { person: 'he / she', form: 'yaha', gloss: 'yehhuatl' },
          { person: 'we', form: 'tohuanti / tohhuantin', gloss: 'tehhuantin' },
          { person: 'you all', form: 'amohuanti', gloss: 'amehhuantin' },
          { person: 'they', form: 'yahuanti', gloss: 'yehhuantin' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'Subject prefixes on verbs',
        caption: 'Using tequiti (to work) as the model verb.',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: 'I', form: 'ni·tequiti', gloss: 'I work' },
          { person: 'you', form: 'ti·tequiti', gloss: 'you work' },
          { person: 'he / she', form: 'tequiti', gloss: 'he/she/it works (no prefix)' },
          { person: 'we', form: 'ti·tequiti·h', gloss: 'we work' },
          { person: 'you all', form: 'an·tequiti·h', gloss: 'you all work' },
          { person: 'they', form: 'tequiti·h', gloss: 'they work' },
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
          { person: 'I', form: 'ni·cihuātl', gloss: 'I am a woman' },
          { person: 'you', form: 'ti·cihuātl', gloss: 'you are a woman' },
          { person: 'he / she', form: 'cihuātl', gloss: 'he/she is a woman' },
          { person: 'we', form: 'ti·cihuāmeh', gloss: 'we are women' },
          { person: 'you all', form: 'in·cihuāmeh', gloss: 'you all are women' },
          { person: 'they', form: 'cihuāmeh', gloss: 'they are women' },
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
    relatedGrammarLabIds: ['subject-prefixes', 'present-tense-verbs'],
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
          { person: 'I', form: 'nitequiti', gloss: 'I work' },
          { person: 'you', form: 'titequiti', gloss: 'you work' },
          { person: 'he / she', form: 'tequiti', gloss: 'he / she / it works' },
          { person: 'we', form: 'titequitih', gloss: 'we work' },
          { person: 'you all', form: 'antequitih', gloss: 'you all work' },
          { person: 'they', form: 'tequitih', gloss: 'they work' },
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
    relatedGrammarLabIds: ['possession-prefixes'],
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
          { person: 'I', form: 'no-', gloss: 'my' },
          { person: 'you', form: 'mo-', gloss: 'your (singular)' },
          { person: 'he / she', form: 'ī-', gloss: 'his / her / its' },
          { person: 'we', form: 'to-', gloss: 'our' },
          { person: 'you all', form: 'amo-', gloss: 'your (plural)' },
          { person: 'they', form: 'in-', gloss: 'their' },
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
          { person: 'I', form: 'notōcah', gloss: 'my name' },
          { person: 'you', form: 'motōcah', gloss: 'your name' },
          { person: 'he / she', form: 'ītōcah', gloss: 'his / her name' },
          { person: 'we', form: 'totōcah', gloss: 'our name' },
          { person: 'you all', form: 'amotōcah', gloss: 'your (pl) name' },
          { person: 'they', form: 'intōcah', gloss: 'their name' },
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
    relatedGrammarLabIds: ['future-tense'],
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
          { person: 'I', form: 'nitequitiz', gloss: 'I will work' },
          { person: 'you', form: 'titequitiz', gloss: 'you will work' },
          { person: 'he / she', form: 'tequitiz', gloss: 'he/she will work' },
          { person: 'we', form: 'titequitizqueh', gloss: 'we will work' },
          { person: 'you all', form: 'antequitizqueh', gloss: 'you all will work' },
          { person: 'they', form: 'tequitizqueh', gloss: 'they will work' },
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
    relatedGrammarLabIds: ['object-prefixes'],
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
        text: `When subject and object prefixes combine, contractions can occur:\n• ni- + c- → **nic-** (I + it): niccua (I eat it), nicāmati (I like it)\n• ti- + c- → **tic-**: ticcua (you eat it), tictlahtoa (you speak it)\n• ti- + c- + ... + -h (1pl) → **ticc-**: ticcuahcuepaāh (we cultivate it)\n\nWhen the subject is 3rd person and the object is 3rd person, the beginner form with a singular object is **qui-**: quicua (he/she eats it), quichīhua (he/she makes it). Learn plural-object forms as explicit vocabulary examples before producing them freely.`,
      },
      {
        kind: 'paradigm',
        heading: 'cua (to eat) — 3sg object, all subjects',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: 'I', form: 'niccua', gloss: 'I eat it' },
          { person: 'you', form: 'ticcua', gloss: 'you eat it' },
          { person: 'he / she', form: 'quicua', gloss: 'he/she eats it' },
          { person: 'we', form: 'ticcuah', gloss: 'we eat it' },
          { person: 'they', form: 'quicuah', gloss: 'they eat it' },
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
    relatedGrammarLabIds: ['past-tense'],
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
          { person: 'I', form: 'ōnihuetz', gloss: 'I fell' },
          { person: 'you', form: 'ōtihuetz', gloss: 'you fell' },
          { person: 'he / she', form: 'ōhuetz', gloss: 'he/she fell' },
          { person: 'we', form: 'ōtihuetzqueh', gloss: 'we fell' },
          { person: 'they', form: 'ōhuetzqueh', gloss: 'they fell' },
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
    relatedGrammarLabIds: ['respect-affection'],
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
          { person: 'I',        form: 'nino- / nimo-', gloss: 'myself (nimo- is more common in EHN)' },
          { person: 'you',      form: 'timo-',         gloss: 'yourself' },
          { person: 'he / she', form: 'mo-',           gloss: 'himself / herself / itself' },
          { person: 'we',       form: 'timo- …-h',     gloss: 'ourselves (final -h marks plural)' },
          { person: 'you all',  form: 'anmo-',         gloss: 'yourselves' },
          { person: 'they',     form: 'mo- …-h',       gloss: 'themselves' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'momachtia (to learn / study) fully conjugated',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: 'I',        form: 'nimomachtia',     gloss: 'I study / I am learning' },
          { person: 'you',      form: 'timomachtia',     gloss: 'you study' },
          { person: 'he / she', form: 'momachtia',       gloss: 'he / she studies' },
          { person: 'we',       form: 'timomachtiah',    gloss: 'we study' },
          { person: 'you all',  form: 'anmomachtiah',    gloss: 'you all study' },
          { person: 'they',     form: 'momachtiah',      gloss: 'they study' },
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
  // ── NEW LESSONS ────────────────────────────────────────────────────────────

  {
    id: 'person-and-number',
    title: "Who's Talking? Person & Number Explained",
    nahuatlTitle: 'Āquiya tlahtoa?',
    band: 'A1',
    shortDesc: 'A plain-English guide to what "first person," "second person," and "plural" mean.',
    relatedUnits: [3],
    sections: [
      {
        kind: 'prose',
        text: `Grammar books love terms like "first person singular" and "third person plural." If that sounds confusing, this page is for you. The idea is simple — every sentence has someone doing the action, and we need a quick way to label who that is.\n\n**Person** tells you WHO is involved. **Number** tells you HOW MANY.`,
      },
      {
        kind: 'paradigm',
        heading: 'Person — who is involved?',
        caption: 'Think of a conversation between two people talking about a third.',
        headers: ['Label', 'Who it means', 'English examples'],
        rows: [
          { person: '1st person', form: 'The speaker — the one talking right now', gloss: 'I, me, my, we, us, our' },
          { person: '2nd person', form: 'The listener — the one being spoken to', gloss: 'you, your, you all' },
          { person: '3rd person', form: 'Everyone else — whoever is being talked about', gloss: 'he, she, it, they, them' },
        ],
      },
      {
        kind: 'rule',
        title: 'An easy way to remember',
        text: `Imagine three people in a room:\n\n• **1st person** = **me** (I'm the one talking)\n• **2nd person** = **you** (I'm talking TO you)\n• **3rd person** = **that person over there** (we're talking ABOUT them)\n\nThat's it. "First," "second," and "third" just count outward from the speaker.`,
      },
      {
        kind: 'paradigm',
        heading: 'Number — how many?',
        caption: 'Each person can be singular (one) or plural (more than one).',
        headers: ['', 'Singular (one)', 'Plural (more than one)'],
        rows: [
          { person: '1st person', form: 'I', gloss: 'we' },
          { person: '2nd person', form: 'you', gloss: 'you all / you guys' },
          { person: '3rd person', form: 'he / she / it', gloss: 'they' },
        ],
      },
      {
        kind: 'prose',
        heading: 'Why does this matter for Nahuatl?',
        text: `In English, you use separate words: "I run," "you run," "they run." In Nahuatl, who is doing the action is shown by a **prefix stuck onto the verb**:\n\n• ni·tequiti = I work (ni- = 1st person singular)\n• ti·tequiti = you work (ti- = 2nd person singular)\n• tequiti = he/she works (no prefix = 3rd person singular)\n• ti·tequiti·h = we work (ti- plus -h = 1st person plural)\n\nSo when you see "1sg" in a grammar table, it just means "I." When you see "2pl" it means "you all." The table below gives you the full cheatsheet.`,
      },
      {
        kind: 'paradigm',
        heading: 'Complete cheatsheet',
        caption: 'Abbreviations you may see in grammar books, mapped to plain English and Nahuatl prefixes.',
        headers: ['Abbreviation', 'Plain English', 'Nahuatl verb prefix'],
        rows: [
          { person: '1sg', form: 'I', gloss: 'ni-' },
          { person: '2sg', form: 'you', gloss: 'ti-' },
          { person: '3sg', form: 'he / she / it', gloss: '(nothing)' },
          { person: '1pl', form: 'we', gloss: 'ti- … -h' },
          { person: '2pl', form: 'you all', gloss: 'an- … -h' },
          { person: '3pl', form: 'they', gloss: '… -h' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'EHN pronouns — same idea, plain labels',
        caption: 'These are optional in conversation because the verb prefix already tells you who is acting.',
        headers: ['Plain English', 'EHN pronoun', 'Emphatic form'],
        rows: [
          { person: 'I', form: 'na', gloss: 'naha' },
          { person: 'you', form: 'ta', gloss: 'taha' },
          { person: 'he / she', form: 'ya', gloss: 'yaha' },
          { person: 'we', form: 'tohuantin', gloss: 'tohuanti' },
          { person: 'you all', form: 'amohuantin', gloss: 'amohuanti' },
          { person: 'they', form: 'yahuantin', gloss: 'yahuanti' },
        ],
      },
      {
        kind: 'rule',
        title: 'Bottom line',
        text: `Whenever you see "first person," "second person," or "third person" in this course, just think: **me, you, or someone else.** Add "singular" for one person or "plural" for more than one. That's all there is to it.`,
      },
    ],
  },

  {
    id: 'verb-overview',
    title: 'How Nahuatl Verbs Work',
    nahuatlTitle: 'Quēn tequitih tlahtōlchihuallōtl',
    band: 'A1',
    shortDesc: 'The "sandwich" structure: prefix + root + suffix — and why one word can be a whole sentence.',
    relatedUnits: [3, 5, 6],
    sections: [
      {
        kind: 'prose',
        text: `In English, "I will eat it" is four separate words. In Nahuatl, the same idea fits into a single word: **niccuaz**. Everything — who is doing it, what they're doing it to, and when — is packed into one verb. This is the key difference between Nahuatl and English, and once you understand the pattern, the whole language opens up.`,
      },
      {
        kind: 'rule',
        title: 'The verb sandwich',
        text: `Every Nahuatl verb follows the same layered structure. Think of it like a sandwich:\n\n**[tense] + [subject] + [object] + [VERB ROOT] + [tense/plural suffix]**\n\nNot every slot is always filled — a simple present-tense intransitive verb like *nitequiti* only uses subject + root. But the slots are always in this order when they appear.`,
      },
      {
        kind: 'paradigm',
        heading: 'Breaking down real verbs',
        caption: 'Each column shows one "slot" in the verb sandwich.',
        headers: ['Full verb', 'Pieces', 'English'],
        rows: [
          { person: 'nitequiti', form: 'ni- + tequiti', gloss: 'I work' },
          { person: 'ticcua', form: 'ti- + c- + cua', gloss: 'you eat it' },
          { person: 'niccuaz', form: 'ni- + c- + cua + -z', gloss: 'I will eat it' },
          { person: 'nimomachtia', form: 'ni- + mo- + machtia', gloss: 'I study (teach myself)' },
          { person: 'ōnihuetz', form: 'ō- + ni- + huetz', gloss: 'I fell (past)' },
          { person: 'titequitih', form: 'ti- + tequiti + -h', gloss: 'we work' },
          { person: 'antequitizqueh', form: 'an- + tequiti + -zqueh', gloss: 'you all will work' },
          { person: 'xitlacua', form: 'xi- + tlacua', gloss: 'eat! (command)' },
        ],
      },
      {
        kind: 'prose',
        heading: 'The five slots explained',
        text: `1. **Tense prefix (optional)**: ō- for past tense. Present and future use no prefix here.\n\n2. **Subject prefix**: ni- (I), ti- (you), nothing (he/she), ti-…-h (we), an-…-h (you all), …-h (they). For commands, xi- replaces the subject prefix.\n\n3. **Object prefix (optional)**: c-/qui- (him/her/it), nēch- (me), mitz- (you), tech- (us), mo- (reflexive "self"), tla- (something unspecified). Only present when the verb is transitive (acts on something).\n\n4. **Verb root**: The core meaning — tequiti (work), cua (eat), machtia (teach), etc.\n\n5. **Tense/plural suffix**: -z (future singular), -zqueh (future plural), -h (present plural), -queh (past plural). Present singular has no suffix.`,
      },
      {
        kind: 'examples',
        heading: 'Practice reading verb sandwiches',
        items: [
          {
            nahuatl: 'Nitlamachtia nāhuatl.',
            breakdown: 'ni- (I) + tlamachtia (teach)',
            translation: 'I teach Nahuatl.',
            note: 'Subject + root only — simple present intransitive',
          },
          {
            nahuatl: 'Ticchihua in tlacualli.',
            breakdown: 'ti- (you) + c- (it) + chihua (make) = you make it',
            translation: 'You are making the food.',
            note: 'Subject + object + root — present transitive',
          },
          {
            nahuatl: 'Ōquicuac in tamalli.',
            breakdown: 'ō- (past) + qui- (it) + cua-c (eat-past) = he ate it',
            translation: 'He/she ate the tamal.',
            note: 'Tense prefix + object + root with past suffix',
          },
          {
            nahuatl: 'Titlacuazqueh tiotlac.',
            breakdown: 'ti- (we) + tlacua (eat) + -zqueh (future plural)',
            translation: 'We will eat in the afternoon.',
            note: 'Subject + root + future plural suffix',
          },
          {
            nahuatl: 'Nimomachtiznequi.',
            breakdown: 'ni- (I) + mo- (self) + machti-z (teach-future) + nequi (want)',
            translation: 'I want to learn.',
            note: 'Compound: "I want to teach-myself" — two verbs fused',
          },
        ],
      },
      {
        kind: 'rule',
        title: 'One word = one sentence',
        text: `Because Nahuatl packs so much into the verb, a single word can express a complete thought. *Niccuaz* is "I will eat it" — subject (I), object (it), action (eat), tense (future), all in six letters. As you learn more prefixes and suffixes, you build longer and more expressive verbs from the same basic pattern.`,
      },
    ],
  },

  {
    id: 'plurals',
    title: 'Plural Nouns: -meh, -tin, and -h',
    nahuatlTitle: 'Miac tlahtōlcuauhmeh',
    band: 'A1',
    shortDesc: 'Three strategies for making nouns plural and when to use each one.',
    relatedUnits: [3, 4],
    sections: [
      {
        kind: 'prose',
        text: `English adds "-s" to make things plural: one book, two books. Nahuatl has three main plural strategies, and which one you use depends on the noun. The good news: the most common strategy (-meh) covers the majority of nouns.`,
      },
      {
        kind: 'rule',
        title: 'Strategy 1: -meh (the default)',
        text: `Drop the absolutive suffix (-tl, -tli, -li) and add **-meh**. This works for most inanimate nouns and many animate ones.\n\n• cihuātl → cihuā**meh** (women)\n• āmoxtli → āmox**meh** (books)\n• cōmalli → comal**meh** (cooking griddles)\n• tepōztli → tepōz**meh** (machines/metals)\n• mācēhualli → mācēhual**meh** (indigenous people)`,
      },
      {
        kind: 'rule',
        title: 'Strategy 2: -tin (animate nouns)',
        text: `Some animate nouns — especially those referring to people — take **-tin** instead of -meh. This is less common but appears in important words:\n\n• tohuantin (we — from tohuān + -tin)\n• yahuantin (they)\n• amohuantin (you all)\n• pipiltin (nobles / children of nobles — from pilli)\n\nIn practice, many nouns that historically took -tin now also accept -meh in spoken EHN.`,
      },
      {
        kind: 'rule',
        title: 'Strategy 3: reduplication + -h',
        text: `A smaller class of nouns forms the plural by **repeating the first syllable** and/or adding **-h**:\n\n• tēuctli → tētēuctin (lords)\n• cihuātl → cicihuah (women — reduplicated alternative)\n• piltzintli → pipiltzitzin (children — with honorific plural)\n\nThis strategy is most common with kinship terms, old words, and the honorific plural -tzitzin.`,
      },
      {
        kind: 'paradigm',
        heading: 'Common plurals at a glance',
        headers: ['Singular', 'Plural', 'Meaning'],
        rows: [
          { person: 'cihuātl', form: 'cihuāmeh', gloss: 'woman → women' },
          { person: 'āmoxtli', form: 'āmoxmeh', gloss: 'book → books' },
          { person: 'cōmalli', form: 'comalmeh', gloss: 'griddle → griddles' },
          { person: 'tepōztli', form: 'tepōzmeh', gloss: 'metal/machine → metals' },
          { person: 'tōtolin', form: 'tōtolmeh', gloss: 'turkey → turkeys' },
          { person: 'mācēhualli', form: 'mācēhualmeh', gloss: 'indigenous person → people' },
          { person: 'pilli', form: 'pipiltin', gloss: 'noble/child → nobles' },
          { person: 'piltzintli', form: 'pipiltzitzin', gloss: 'child → children (honorific)' },
          { person: 'conētl', form: 'conēmeh', gloss: 'baby → babies' },
          { person: 'chichi', form: 'chichimeh', gloss: 'dog → dogs' },
        ],
      },
      {
        kind: 'rule',
        title: 'Quick rule of thumb',
        text: `When in doubt, use **-meh**. It covers about 80% of nouns. You'll pick up the -tin and reduplicated forms naturally as you learn specific vocabulary.`,
      },
      {
        kind: 'examples',
        heading: 'Plurals in context',
        items: [
          {
            nahuatl: 'Cihuāmeh tequitih pan mīllah.',
            breakdown: 'cihuā-meh tequiti-h pan mīllah.',
            translation: 'The women work in the milpa.',
            note: 'Both noun (-meh) and verb (-h) carry plural markers',
          },
          {
            nahuatl: 'Nopiltzitzin mohmōztlah yohuih caltlamachticān.',
            breakdown: 'no-pil-tzitzin mohmōztlah yohuih caltlamachticān.',
            translation: 'My children go to school every day.',
            note: '-tzitzin = honorific plural of -tzin',
          },
          {
            nahuatl: 'Quezqui āmoxmeh ticpiya?',
            breakdown: 'Quezqui āmox-meh ti-c-piya?',
            translation: 'How many books do you have?',
            note: 'Standard -meh plural',
          },
        ],
      },
    ],
  },

  {
    id: 'locatives',
    title: 'Places: Locative Suffixes',
    nahuatlTitle: 'Cāmpa? — Tlatēcpānaliztli tlen cānōc',
    band: 'A1',
    shortDesc: 'How Nahuatl names places using suffixes like -co, -pan, -can, and -tlan.',
    relatedUnits: [6, 7],
    sections: [
      {
        kind: 'prose',
        text: `Many Nahuatl place names you already know — Mexico, Chicontepec, Tenochtitlan — end in locative suffixes that mean "at," "in," or "near." These same suffixes are used productively to create new place words. Once you recognize them, place names stop being opaque strings and start telling you what the place is about.`,
      },
      {
        kind: 'paradigm',
        heading: 'The main locative suffixes',
        headers: ['Suffix', 'Meaning', 'Examples'],
        rows: [
          { person: '-co', form: 'in / at (a contained place)', gloss: 'Mexco (in Mexico), ātoyaco (at the river)' },
          { person: '-pan', form: 'on / upon / at (a surface)', gloss: 'tlālpan (on the ground), tepēpan (on the hill)' },
          { person: '-can', form: 'place of / where X happens', gloss: 'tlacuācan (eating place), tequitican (workplace)' },
          { person: '-tlan', form: 'near / among / place of', gloss: 'cuauhtlan (in the forest), Mazatlān (place of deer)' },
          { person: '-nāhuac', form: 'next to / beside', gloss: 'ātenāhuac (beside the water), Cuauhnāhuac (Cuernavaca)' },
          { person: '-yan', form: 'place where X is done', gloss: 'caltlamachtiloyan (school — place of teaching)' },
        ],
      },
      {
        kind: 'rule',
        title: 'How locatives are built',
        text: `Take a noun stem (drop the absolutive suffix) and add the locative:\n\n• cāl- (from cālli, house) + -tlamachtiloyan → **caltlamachtiloyan** (school — lit. "house where teaching is done")\n• cuauh- (from cuahuitl, tree/wood) + -tlan → **cuauhtlan** (forest — lit. "among the trees")\n• ā- (from ātl, water) + -tēnco → **ātēnco** (riverbank — "at the edge of water")\n• mīl- (from mīlli, cultivated field) + -lah → **mīllah** (in the milpa)\n\nThe suffix -lah (variant of -tlan) appears in many EHN place words.`,
      },
      {
        kind: 'paradigm',
        heading: 'Place names decoded',
        headers: ['Place name', 'Pieces', 'Literal meaning'],
        rows: [
          { person: 'Mexco', form: 'Mex- (moon/navel?) + -co', gloss: 'At the navel of the moon' },
          { person: 'Chicōntepēc', form: 'chicōn- (seven) + tepē- (hill) + -c', gloss: 'At the seven hills' },
          { person: 'Cuauhnāhuac', form: 'cuauh- (tree) + -nāhuac (near)', gloss: 'Near the trees (= Cuernavaca)' },
          { person: 'Mazatlān', form: 'maza- (deer) + -tlan', gloss: 'Place of deer' },
          { person: 'Tenochtitlān', form: 'te- (stone) + nochtli (cactus) + -tlan', gloss: 'Among the stone cacti' },
          { person: 'caltlamachtiloyan', form: 'cal- (house) + tlamachtilo- (teaching) + -yan', gloss: 'Place where teaching happens (= school)' },
        ],
      },
      {
        kind: 'examples',
        heading: 'Locatives in dialogue',
        items: [
          {
            nahuatl: 'Na niēhua Tecomate, Chicōntepēc.',
            breakdown: 'Na ni·ēhua Tecomate, Chicōntepēc.',
            translation: 'I am from Tecomate, Chicontepec.',
            note: 'Both place names carry locative meaning',
          },
          {
            nahuatl: 'Nitequiti pan caltlamachtiloyan.',
            breakdown: 'Ni·tequiti pan caltlamachtiloyan.',
            translation: 'I work at the school.',
            note: '-yan locative = "place of teaching"',
          },
          {
            nahuatl: 'Niyāuh tiānquiz.',
            breakdown: 'Ni·yāuh tiānquiz.',
            translation: 'I am going to the market.',
            note: 'tiānquiz = marketplace (from tiānquiztli)',
          },
          {
            nahuatl: 'Pan tomīllah ticcuahcuepaāh etl.',
            breakdown: 'Pan to·mīllah ti·c·cuahcuepāh etl.',
            translation: 'In our milpa we cultivate beans.',
            note: 'mīllah = "in the milpa" — locative of mīlli',
          },
        ],
      },
    ],
  },

  {
    id: 'directionals',
    title: 'Coming & Going: on-, hual-',
    nahuatlTitle: 'Ōntiyāuh, huālniyāuh',
    band: 'A2',
    shortDesc: 'Directional prefixes that show whether the action moves toward or away from the speaker.',
    relatedUnits: [12, 14],
    sections: [
      {
        kind: 'prose',
        text: `English uses separate words like "come" vs. "go" or "bring" vs. "take" to show direction. Nahuatl has a more elegant system: **directional prefixes** that can be attached to ANY verb to show whether the action is moving toward the speaker or away.`,
      },
      {
        kind: 'paradigm',
        heading: 'The two directional prefixes',
        headers: ['Prefix', 'Direction', 'English equivalent'],
        rows: [
          { person: 'on-', form: 'away from the speaker', gloss: '"go and do X" / "do X over there"' },
          { person: 'hual- / huāl-', form: 'toward the speaker', gloss: '"come and do X" / "do X here"' },
        ],
      },
      {
        kind: 'rule',
        title: 'Where they go in the verb',
        text: `Directionals sit between the subject prefix and the object prefix (or verb root):\n\n**[subject] + [directional] + [object] + [verb root] + [suffix]**\n\n• ni- + on- + tequiti = **nontequiti** (I go to work / I work over there)\n• ni- + hual- + lāuh = **nihuāllāuh** (I come — literally "I here-go")\n• ti- + on- + c- + cua = **tonccua** (you go eat it over there)\n• xi- + hual- + lā = **xihuāllā** (come! — the most common greeting command)`,
      },
      {
        kind: 'paradigm',
        heading: 'Directionals in action',
        caption: 'Same base verb, different direction.',
        headers: ['With on- (going)', 'With hual- (coming)', 'Base verb'],
        rows: [
          { person: 'nontequiti (I go work)', form: 'nihuāltequiti (I come to work)', gloss: 'tequiti (to work)' },
          { person: 'xoncua! (go eat it!)', form: 'xihuālcua! (come eat it!)', gloss: 'cua (to eat)' },
          { person: 'onyāuh (he goes away)', form: 'huāllāuh (he comes)', gloss: 'yāuh (to go)' },
          { person: 'toncuāzqueh (we\'ll go eat)', form: 'tihuālcuāzqueh (we\'ll come eat)', gloss: 'cua (to eat)' },
        ],
      },
      {
        kind: 'rule',
        title: 'on- and hual- with specific verbs',
        text: `Some directional + verb combinations are so common they feel like their own vocabulary words:\n\n• **huāllāuh** (hual- + yāuh) = "to come" — the most frequent word using hual-\n• **on-nēhnemi** = "to go for a walk / to walk away"\n• **hual-mocuepa** = "to come back / return here"\n• **on-mocuepa** = "to go back / return there"\n\nYou already know *xihuāllā* (come!) — that's the imperative of huāllāuh.`,
      },
      {
        kind: 'examples',
        heading: 'In dialogue',
        items: [
          {
            nahuatl: 'Xihuāllā, titlacuāzqueh!',
            breakdown: 'Xi·huāl·lā, ti·tlacuā·zqueh!',
            translation: 'Come, we will eat!',
            note: 'xi- (imperative) + huāl- (toward speaker) + lā (go)',
          },
          {
            nahuatl: 'Tiotlac nihuāllāz.',
            breakdown: 'Tiotlac ni·huāl·lā·z.',
            translation: "I'll come back in the afternoon.",
            note: 'hual- + yāuh + -z (future) = "I will come"',
          },
          {
            nahuatl: 'Onyāuh mīllah.',
            breakdown: 'On·yāuh mīllah.',
            translation: 'He went off to the milpa.',
            note: 'on- = away; yāuh = go; 3sg so no subject prefix',
          },
          {
            nahuatl: 'Mōztla nihuālmocuepaz.',
            breakdown: 'Mōztla ni·huāl·mo·cuepa·z.',
            translation: 'Tomorrow I will come back.',
            note: 'hual- (toward) + mo- (reflexive) + cuepa (turn) + -z (future)',
          },
        ],
      },
    ],
  },

  {
    id: 'relational-nouns',
    title: 'Relational Nouns: How Nahuatl Says "in," "on," "with"',
    nahuatlTitle: 'Tlahtōlcēntilīztli',
    band: 'A2',
    shortDesc: 'Nahuatl uses possessed nouns instead of prepositions — "my-face" means "in front of me."',
    relatedUnits: [8, 10],
    sections: [
      {
        kind: 'prose',
        text: `English uses prepositions: in, on, with, for, about. Nahuatl does something different — it uses **relational nouns**. These are ordinary nouns (body parts, spatial concepts) that take a possessive prefix to express relationships. "On top of the table" becomes literally "its-top the table." Once you see the pattern, it's intuitive.`,
      },
      {
        kind: 'paradigm',
        heading: 'Common relational nouns',
        caption: 'The 3sg possessed form (ī-) is shown; swap in no-/mo-/to- for other persons.',
        headers: ['Relational noun', 'Literal meaning', 'Used as…'],
        rows: [
          { person: '-pan', form: 'surface / on top of', gloss: '"on, upon, at" — īpan (on it)' },
          { person: '-tech', form: 'body / substance', gloss: '"on, touching, about" — ītech (on/about it)' },
          { person: '-ica', form: 'face / means', gloss: '"with, by means of" — īca (with it)' },
          { person: '-tlan', form: 'teeth / base / near', gloss: '"near, beside" — ītlan (near it/him)' },
          { person: '-nahuac', form: 'close-to', gloss: '"beside, next to" — īnāhuac (next to it)' },
          { person: '-pampa', form: 'cause / reason', gloss: '"because of" — īpampa (because of it)' },
          { person: '-huān', form: 'companion', gloss: '"with (a person)" — īhuān (with him/her)' },
        ],
      },
      {
        kind: 'rule',
        title: 'How they work',
        text: `Relational nouns take a possessive prefix (no-, mo-, ī-, to-, amo-, in-) just like any possessed noun. The "possessor" is whoever/whatever the relationship is about.\n\n• **no-pan** = on me / at my place\n• **mo-pampa** = because of you\n• **ī-ca** = with it / by means of it\n• **to-tlan** = near us\n\nThe most common standalone form is **pan**, which often appears without an explicit possessive prefix as a general preposition meaning "in/at/on."`,
      },
      {
        kind: 'examples',
        heading: 'Relational nouns in dialogue',
        items: [
          {
            nahuatl: 'Nitequiti pan caltlamachtiloyan.',
            breakdown: 'Ni·tequiti pan caltlamachtiloyan.',
            translation: 'I work at the school.',
            note: 'pan = general locative "at/in" (relational noun without possessor)',
          },
          {
            nahuatl: 'Huānya nocihuāuh niyāuh tiānquiz.',
            breakdown: 'Huānya no·cihuāuh ni·yāuh tiānquiz.',
            translation: 'With my wife I go to the market.',
            note: 'huānya = with (from -huān relational noun + ya)',
          },
          {
            nahuatl: 'Ipampa in ātl, āmo tiyāzqueh.',
            breakdown: 'I·pampa in ātl, āmo ti·yāz·queh.',
            translation: "Because of the water (rain), we won't go.",
            note: 'ī-pampa = because of it; referring to ātl (water/rain)',
          },
          {
            nahuatl: 'Nitlamachtia nāhuatl īca yāhuatzinco.',
            breakdown: 'Ni·tlamachtia nāhuatl ī·ca yāhuatzinco.',
            translation: 'I teach Nahuatl in the morning.',
            note: 'īca = "with/by/during" — temporal use of relational noun',
          },
        ],
      },
      {
        kind: 'rule',
        title: 'pan — the Swiss Army knife',
        text: `The relational noun **pan** deserves special attention because it's everywhere in EHN:\n\n• pan mīllah = in the milpa\n• pan caltlamachtiloyan = at school\n• pan ohtli = on the road\n• pan āltepētl = in the town\n\nThink of it as the default "at/in/on" — similar to how English speakers overuse "at."`,
      },
    ],
  },

  {
    id: 'verb-conjugation-summary',
    title: 'Complete Verb Conjugation Table',
    nahuatlTitle: 'Tlahtōlchihuallōtl mochīn cāhuitl',
    band: 'A2',
    shortDesc: 'A master reference showing one verb fully conjugated across all tenses and persons.',
    relatedUnits: [5, 6, 7, 11],
    sections: [
      {
        kind: 'prose',
        text: `This page is a reference card. It shows the intransitive verb **tequiti** (to work) fully conjugated in every major tense, plus a second table for the transitive verb **cua** (to eat) with a 3rd-person object. Bookmark this and come back whenever you need a quick check.`,
      },
      {
        kind: 'paradigm',
        heading: 'tequiti (to work) — Present',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: 'I', form: 'nitequiti', gloss: 'I work' },
          { person: 'you', form: 'titequiti', gloss: 'you work' },
          { person: 'he / she', form: 'tequiti', gloss: 'he/she works' },
          { person: 'we', form: 'titequitih', gloss: 'we work' },
          { person: 'you all', form: 'antequitih', gloss: 'you all work' },
          { person: 'they', form: 'tequitih', gloss: 'they work' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'tequiti — Future (-z / -zqueh)',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: 'I', form: 'nitequitiz', gloss: 'I will work' },
          { person: 'you', form: 'titequitiz', gloss: 'you will work' },
          { person: 'he / she', form: 'tequitiz', gloss: 'he/she will work' },
          { person: 'we', form: 'titequitizqueh', gloss: 'we will work' },
          { person: 'you all', form: 'antequitizqueh', gloss: 'you all will work' },
          { person: 'they', form: 'tequitizqueh', gloss: 'they will work' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'tequiti — Past (ō- + perfective)',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: 'I', form: 'ōnitequitic', gloss: 'I worked' },
          { person: 'you', form: 'ōtitequitic', gloss: 'you worked' },
          { person: 'he / she', form: 'ōtequitic', gloss: 'he/she worked' },
          { person: 'we', form: 'ōtitequitiqueh', gloss: 'we worked' },
          { person: 'you all', form: 'ōantequitiqueh', gloss: 'you all worked' },
          { person: 'they', form: 'ōtequitiqueh', gloss: 'they worked' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'tequiti — Imperative (xi-)',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: 'you (command)', form: 'xitequiti!', gloss: 'work!' },
          { person: 'you all (command)', form: 'xitequiticān!', gloss: 'work, all of you!' },
          { person: 'let him/her (optative)', form: 'mā tequiti', gloss: 'may he/she work' },
          { person: "let's (hortative)", form: 'mā titequiticān', gloss: "let's work" },
        ],
      },
      {
        kind: 'prose',
        heading: 'Transitive verb: cua (to eat) with object "it"',
        text: `When the verb takes an object, the object prefix (c-/qui-) appears between the subject prefix and the verb root. Below is cua conjugated with a 3rd-person singular object ("it").`,
      },
      {
        kind: 'paradigm',
        heading: 'cua (to eat it) — Present',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: 'I', form: 'niccua', gloss: 'I eat it' },
          { person: 'you', form: 'ticcua', gloss: 'you eat it' },
          { person: 'he / she', form: 'quicua', gloss: 'he/she eats it' },
          { person: 'we', form: 'ticcuah', gloss: 'we eat it' },
          { person: 'they', form: 'quicuah', gloss: 'they eat it' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'cua (to eat it) — Future',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: 'I', form: 'niccuaz', gloss: 'I will eat it' },
          { person: 'you', form: 'ticcuaz', gloss: 'you will eat it' },
          { person: 'he / she', form: 'quicuaz', gloss: 'he/she will eat it' },
          { person: 'we', form: 'ticcuazqueh', gloss: 'we will eat it' },
          { person: 'they', form: 'quicuazqueh', gloss: 'they will eat it' },
        ],
      },
      {
        kind: 'paradigm',
        heading: 'cua (to eat it) — Past',
        headers: ['Person', 'Form', 'Meaning'],
        rows: [
          { person: 'I', form: 'ōniccuac', gloss: 'I ate it' },
          { person: 'you', form: 'ōticcuac', gloss: 'you ate it' },
          { person: 'he / she', form: 'ōquicuac', gloss: 'he/she ate it' },
          { person: 'we', form: 'ōticcuaqueh', gloss: 'we ate it' },
          { person: 'they', form: 'ōquicuaqueh', gloss: 'they ate it' },
        ],
      },
      {
        kind: 'rule',
        title: 'Pattern summary',
        text: `Once you know one conjugation, you know them all. The formula is always:\n\n**[ō- past] + [subject: ni-/ti-/an-/ø] + [object: c-/qui-] + [root] + [tense: -z/-zqueh/-c/-queh] + [plural: -h]**\n\nMost irregularity comes from stem changes in the past tense (e.g. cua → cuac, yāuh → yāc). The prefix/suffix pattern stays the same.`,
      },
    ],
  },

  {
    id: 'compound-verbs',
    title: 'Compound Verbs & Noun Incorporation',
    nahuatlTitle: 'Tlahtōlnēnepanōlli',
    band: 'B1',
    shortDesc: 'How Nahuatl builds new verbs by folding nouns into the verb or chaining verb roots.',
    relatedUnits: [15, 20],
    sections: [
      {
        kind: 'prose',
        text: `One of Nahuatl's most distinctive features is **noun incorporation** — taking a noun and fusing it directly into the verb. English does this rarely ("babysit," "breastfeed"), but Nahuatl does it constantly. The incorporated noun replaces the generic object prefix (tla-) with something specific, creating a single compact word.`,
      },
      {
        kind: 'rule',
        title: 'How noun incorporation works',
        text: `Instead of saying "I eat tortillas" as two words (*niccua tlaxcalli*), you can fold the noun into the verb:\n\n**ni- + tlaxcal- + cua** → **nitlaxcalcua** ("I tortilla-eat")\n\nThe noun stem (without its absolutive suffix) goes directly before the verb root. This creates a new intransitive verb — the object is now baked in.\n\nFormula: **[subject prefix] + [noun stem] + [verb root]**`,
      },
      {
        kind: 'paradigm',
        heading: 'Common incorporated verbs',
        caption: 'The noun stem appears in bold within the compound.',
        headers: ['Compound verb', 'Pieces', 'Meaning'],
        rows: [
          { person: 'nitlaxcalcua', form: 'ni- + tlaxcal- + cua', gloss: 'I eat tortillas' },
          { person: 'nitlaxcalchihua', form: 'ni- + tlaxcal- + chihua', gloss: 'I make tortillas' },
          { person: 'nitlacua', form: 'ni- + tla- + cua', gloss: 'I eat (something)' },
          { person: 'niātli', form: 'ni- + ā- + tli…', gloss: 'I drink water (ā- = water)' },
          { person: 'nicuachīhua', form: 'ni- + cuā- + chīhua', gloss: 'I do woodwork (cuahuitl = wood)' },
          { person: 'nimīxxāmia', form: 'ni- + m- + īx- + xāmia', gloss: 'I wash my face (reflexive + face)' },
          { person: 'nitlachpāna', form: 'ni- + tla- + chpāna', gloss: 'I sweep (something)' },
        ],
      },
      {
        kind: 'rule',
        title: 'tla- and tē- as generic objects',
        text: `Two special "noun" prefixes appear constantly:\n\n• **tla-** = "something / things" (indefinite inanimate object)\n• **tē-** = "someone / people" (indefinite animate object)\n\nThese aren't really nouns but they fill the noun-incorporation slot:\n\n• ni-**tla**-cua = I eat (things) — generic eating\n• ni-**tla**-machtia = I teach (things/knowledge)\n• ni-**tē**-māca = I give (to people)\n• ni-**tē**-pālēhuia = I help (people)\n\nWhen you see tla- or tē- in a verb, you know it has a generic object built in.`,
      },
      {
        kind: 'prose',
        heading: 'Verb + verb compounds',
        text: `Nahuatl also chains verbs together. The most common pattern is **verb stem + nequi** ("to want"):\n\n• ni-tlacua-**znequi** = I want to eat (future stem + nequi)\n• ni-momachti-**znequi** = I want to learn\n• ni-cochi-**znequi** = I want to sleep\n\nOther combining verbs include **-tia** (to cause), **-huetzi** (to fall into doing = to start suddenly), and **-cāhua** (to stop/leave = to stop doing).`,
      },
      {
        kind: 'examples',
        heading: 'Compounds in context',
        items: [
          {
            nahuatl: 'Nitlaxcalchihua mohmōztlah.',
            breakdown: 'Ni-tlaxcal-chihua mohmōztlah.',
            translation: 'I make tortillas every day.',
            note: 'tlaxcal- (tortilla) incorporated into chihua (to make)',
          },
          {
            nahuatl: 'Nimomachtiznequi nāhuatl.',
            breakdown: 'Ni-mo-machti-z-nequi nāhuatl.',
            translation: 'I want to learn Nahuatl.',
            note: 'momachtia + future -z + nequi (want) = compound verb',
          },
          {
            nahuatl: 'Nonanā tēchmāca cafen yāhuatzinco.',
            breakdown: 'No-nanā tēch-māca cafen yāhuatzinco.',
            translation: 'My mother gives us coffee in the morning.',
            note: 'tēch- (us, object) + māca (give) — not incorporation but shows tē-type object',
          },
          {
            nahuatl: 'Āmo niccochiznequi āxcan.',
            breakdown: 'Āmo ni-c-cochi-z-nequi āxcan.',
            translation: "I don't want to sleep now.",
            note: 'Negation + verb compound: cochi (sleep) + znequi (want)',
          },
        ],
      },
    ],
  },

  {
    id: 'aspect-mood',
    title: 'Beyond Tense: Aspect & Mood',
    nahuatlTitle: 'Oc cequin tlen cāhuitl',
    band: 'B1',
    shortDesc: 'Habitual actions, ongoing processes, wishes, and other ways to talk about time beyond past/present/future.',
    relatedUnits: [18, 22],
    sections: [
      {
        kind: 'prose',
        text: `You've learned past (ō-), present, and future (-z). But not everything fits neatly into those three boxes. What about "I used to work there" or "I was eating when…"? Nahuatl handles these through **aspect** (how an action unfolds in time) and **mood** (the speaker's attitude toward the action — is it a fact, a wish, a possibility?).`,
      },
      {
        kind: 'rule',
        title: 'Habitual: "I always / I usually"',
        text: `In EHN, the present tense already covers habitual actions — "nitequiti" can mean both "I work (right now)" and "I work (in general / as my job)." Context and time words make the habitual reading clear:\n\n• **mohmōztlah** nitequiti = "I work every day" (habitual)\n• **quēmman** nitequiti = "sometimes I work" (occasional habitual)\n• **nochipa** nitlacua etl = "I always eat beans" (persistent habitual)`,
      },
      {
        kind: 'rule',
        title: 'Progressive: "I am doing it right now"',
        text: `To emphasize that something is happening right now (not habitual), EHN often uses the existential verb **cah** (to be located) or **itztoc** (to be sitting/existing) alongside the main verb:\n\n• Nicān ni**cah** ni**tequiti** = "I am (here) working" (right now)\n• Ti**itztoc** ti**tlacua** = "you are (sitting) eating"\n\nThe auxiliary verb carries the "in progress" meaning. The main verb stays in its present form.`,
      },
      {
        kind: 'paradigm',
        heading: 'Aspect and mood markers',
        headers: ['Marker', 'What it expresses', 'Example'],
        rows: [
          { person: '(present form)', form: 'Present / habitual', gloss: 'nitequiti — I work / I am working' },
          { person: 'cah / itztoc +', form: 'Progressive (right now)', gloss: 'nicah nitequiti — I am working (right now)' },
          { person: 'ō- + perfective', form: 'Completed past', gloss: 'ōnitequitic — I worked (finished)' },
          { person: '-z / -zqueh', form: 'Future / intention', gloss: 'nitequitiz — I will work' },
          { person: 'mā', form: 'Optative / wish', gloss: 'mā nitequiti — may I work / let me work' },
          { person: 'quēmman', form: 'Habitual (with time word)', gloss: 'quēmman nitequiti — sometimes I work' },
          { person: '-toya / -ticah', form: 'Imperfect (was doing)', gloss: 'nitequititoya — I was working / I used to work' },
        ],
      },
      {
        kind: 'rule',
        title: 'Imperfect: "I was doing / I used to"',
        text: `For past actions that were ongoing (not completed), EHN uses the suffix **-toya** (from "to be lying/existing"):\n\n• ni-tequiti-**toya** = "I was working / I used to work"\n• ti-cochi-**toya** = "you were sleeping"\n• tlacua-**toya** = "he/she was eating"\n\nThis is similar to the Spanish imperfect (trabajaba vs. trabajé). Use -toya when the action was in progress or repeated in the past, and ō- + perfective when it was a one-time completed event.`,
      },
      {
        kind: 'rule',
        title: 'Optative / wish: mā',
        text: `The particle **mā** before a verb expresses a wish, permission, or gentle command:\n\n• **mā cuālli pano** = "may it go well" (farewell blessing)\n• **mā tiyāzqueh** = "let's go" (hortative — 1pl)\n• **mā nicān cah** = "let him/her be here"\n• **mā Dios mitzpalēhui** = "may God help you"\n\nWith 2nd person, mā softens an imperative into a polite request (see the Commands lesson).`,
      },
      {
        kind: 'examples',
        heading: 'Aspect and mood in context',
        items: [
          {
            nahuatl: 'Mohmōztlah nitequiti pan caltlamachtiloyan.',
            breakdown: 'Mohmōztlah ni-tequiti pan caltlamachtiloyan.',
            translation: 'Every day I work at the school.',
            note: 'Habitual: present tense + time word mohmōztlah (every day)',
          },
          {
            nahuatl: 'Nicah nitlaxcalchihua.',
            breakdown: 'Ni-cah ni-tlaxcal-chihua.',
            translation: 'I am making tortillas (right now).',
            note: 'Progressive: nicah (I am here) + main verb',
          },
          {
            nahuatl: 'Nitequititoya quēmman ōhuāllāc.',
            breakdown: 'Ni-tequiti-toya quēmman ō-huāllā-c.',
            translation: 'I was working when he arrived.',
            note: 'Imperfect -toya for ongoing past; ō- perfective for the interrupting event',
          },
          {
            nahuatl: 'Mā cuālli ximopano.',
            breakdown: 'Mā cuālli xi-mo-pano.',
            translation: 'May things go well for you.',
            note: 'Optative mā expressing a wish/blessing',
          },
        ],
      },
    ],
  },
  {
    id: 'conditionals',
    title: 'Conditionals with intla',
    nahuatlTitle: 'Intla',
    band: 'A1',
    shortDesc: 'How to build simple if/then sentences with familiar present forms.',
    relatedUnits: [30],
    relatedGrammarLabIds: ['conditionals'],
    sections: [
      {
        kind: 'prose',
        text: `The word **intla** means "if." For beginner production, keep the pattern simple: put **intla** before the condition, then give the result as a second clause. Each clause keeps its own subject prefix.`,
      },
      {
        kind: 'rule',
        title: 'Basic pattern',
        text: `**intla + condition, result**\n\nUse forms you already know in each clause:\n• Intla nitequiti, nitlacua. = If I work, I eat.\n• Intla tiyāuh, niyāuh. = If you go, I go.\n• Intla tequitih, titequitih. = If they work, we work.`,
      },
      {
        kind: 'examples',
        heading: 'Simple conditionals',
        items: [
          {
            nahuatl: 'Intla nitequiti, nitlacua.',
            breakdown: 'intla ni-tequiti, ni-tlacua',
            translation: 'If I work, I eat.',
            note: 'intla introduces the condition.',
          },
          {
            nahuatl: 'Intla tiyāuh, niyāuh.',
            breakdown: 'intla ti-yāuh, ni-yāuh',
            translation: 'If you go, I go.',
            note: 'Each clause keeps its own subject prefix.',
          },
          {
            nahuatl: 'Intla tequitih, titequitih.',
            breakdown: 'intla tequiti-h, ti-tequiti-h',
            translation: 'If they work, we work.',
            note: 'Both clauses use present plural forms.',
          },
        ],
      },
    ],
  },
];

export function getGrammarLesson(id: string): GrammarLesson | undefined {
  return GRAMMAR_LESSONS.find((l) => l.id === id);
}
