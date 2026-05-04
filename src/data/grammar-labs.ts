export type GrammarLab = {
  id: string;
  unit: number;
  band: "A1" | "A2" | "B1";
  title: string;
  shortDesc: string;
  pattern: string;
  explanation: string;
  examples: GrammarLabExample[];
  drills: GrammarLabDrill[];
};

export type GrammarLabExample = {
  nahuatl: string;
  breakdown: string;
  translation: string;
  note?: string;
};

export type GrammarLabDrill =
  | {
      kind: "identify";
      heading: string;
      prompt: string;
      items: {
        prompt: string;
        answer: string;
        explanation: string;
      }[];
    }
  | {
      kind: "transform";
      heading: string;
      prompt: string;
      items: {
        input: string;
        target: string;
        answer: string;
        breakdown: string;
        explanation: string;
        accepted?: string[];
      }[];
    }
  | {
      kind: "paradigm";
      heading: string;
      prompt: string;
      rows: {
        cue: string;
        answer: string;
        breakdown: string;
        translation: string;
      }[];
    }
  | {
      kind: "produce";
      heading: string;
      prompt: string;
      items: {
        english: string;
        answer: string;
        breakdown: string;
        explanation: string;
        accepted?: string[];
      }[];
    };

export const GRAMMAR_LABS: GrammarLab[] = [
  {
    id: "noun-endings",
    unit: 8,
    band: "A1",
    title: "Spot the Noun Ending",
    shortDesc: "Practice seeing a standalone noun as a base plus a visible ending.",
    pattern: "base + noun ending",
    explanation:
      "Beginner guidance: many standalone nouns end in -tl, -tli, -li, or -n. Learn each full word first. Then practice noticing the base underneath, because that base often appears again in possession and plural lessons. Some nouns are best learned as fixed forms, so do not guess new forms from this pattern alone.",
    examples: [
      {
        nahuatl: "cīntli",
        breakdown: "cīn-tli",
        translation: "ear of corn",
        note: "-tli is the visible ending in this standalone noun.",
      },
      {
        nahuatl: "calli",
        breakdown: "cal-li",
        translation: "house",
        note: "The stem is cal-, which you will see again in possessed forms such as nocal.",
      },
      {
        nahuatl: "xōchitl",
        breakdown: "xōchi-tl",
        translation: "flower",
        note: "-tl is visible at the end. This lab asks you to identify pieces, not to infer all possible noun forms.",
      },
      {
        nahuatl: "āmoxtli",
        breakdown: "āmox-tli",
        translation: "book",
        note: "The full word is the form to learn; the split just helps you see the pieces.",
      },
    ],
    drills: [
      {
        kind: "identify",
        heading: "Find the ending",
        prompt: "Type the visible ending shown in each noun.",
        items: [
          {
            prompt: "cīntli",
            answer: "-tli",
            explanation: "cīntli can be split as cīn-tli, with -tli at the end.",
          },
          {
            prompt: "calli",
            answer: "-li",
            explanation: "calli is analyzed here as cal-li for beginner stem practice.",
          },
        ],
      },
      {
        kind: "transform",
        heading: "Stem plus ending",
        prompt: "Build the standalone noun from the base and the ending.",
        items: [
          {
            input: "cīn- + -tli",
            target: "make the standalone noun",
            answer: "cīntli",
            breakdown: "cīn + tli",
            explanation: "The stem cīn- combines with -tli to give cīntli.",
          },
          {
            input: "cal- + -li",
            target: "make the standalone noun",
            answer: "calli",
            breakdown: "cal + li",
            explanation: "The final l of the stem sits next to -li, producing calli.",
          },
          {
            input: "xōchi- + -tl",
            target: "make the standalone noun",
            answer: "xōchitl",
            breakdown: "xōchi + tl",
            explanation: "The base xōchi- combines with -tl to give xōchitl.",
          },
        ],
      },
      {
        kind: "produce",
        heading: "Name the stem",
        prompt: "Type the stem you would keep for beginner analysis.",
        items: [
          {
            english: "stem of calli",
            answer: "cal",
            breakdown: "cal-li",
            explanation: "The learner stem shown here is cal-, useful for forms such as nocal.",
            accepted: ["cal-"],
          },
          {
            english: "stem of cīntli",
            answer: "cīn",
            breakdown: "cīn-tli",
            explanation: "Remove the visible -tli ending to see the learner stem cīn-.",
            accepted: ["cīn-"],
          },
        ],
      },
    ],
  },
  {
    id: "name-exchange",
    unit: 3,
    band: "A1",
    title: "Ask and Answer Names",
    shortDesc: "Practice the exact Unit 3 exchange: “My name is...” and “What is your name?”",
    pattern: "no-/mo-/ī- + tōcah",
    explanation:
      "In this lesson pattern, tōcah means “name.” Add no- for “my,” mo- for “your,” and ī- for “her/his.” Use notōcah when you give your name. Use motōcah when you ask someone their name.",
    examples: [
      {
        nahuatl: "Na notōcah Juana.",
        breakdown: "na no-tōcah Juana",
        translation: "My name is Juana.",
        note: "notōcah means “my name.” The name comes after it.",
      },
      {
        nahuatl: "¿Quēniuhqui motōcah?",
        breakdown: "quēniuhqui mo-tōcah",
        translation: "What is your name?",
        note: "motōcah means “your name.”",
      },
      {
        nahuatl: "Ītōcah María.",
        breakdown: "ī-tōcah María",
        translation: "Her/his name is María.",
        note: "ī- means “her/his” in this possessed noun pattern.",
      },
      {
        nahuatl: "Huan ta, ¿quēniuhqui motōcah?",
        breakdown: "huan ta, quēniuhqui mo-tōcah",
        translation: "And you, what is your name?",
        note: "ta makes the question point clearly to “you.”",
      },
    ],
    drills: [
      {
        kind: "identify",
        heading: "Choose the name word",
        prompt: "Type the possessed name word you see.",
        items: [
          {
            prompt: "my name",
            answer: "notōcah",
            explanation: "no- means “my,” so no-tōcah means “my name.”",
          },
          {
            prompt: "your name",
            answer: "motōcah",
            explanation: "mo- means “your,” so mo-tōcah means “your name.”",
          },
          {
            prompt: "her/his name",
            answer: "ītōcah",
            explanation: "ī- means “her/his,” so ī-tōcah means “her/his name.”",
          },
        ],
      },
      {
        kind: "paradigm",
        heading: "tōcah with possessors",
        prompt: "Read the name forms before producing your own.",
        rows: [
          {
            cue: "my name",
            answer: "notōcah",
            breakdown: "no-tōcah",
            translation: "my name",
          },
          {
            cue: "your name",
            answer: "motōcah",
            breakdown: "mo-tōcah",
            translation: "your name",
          },
          {
            cue: "her/his name",
            answer: "ītōcah",
            breakdown: "ī-tōcah",
            translation: "her/his name",
          },
        ],
      },
      {
        kind: "transform",
        heading: "Build the name form",
        prompt: "Use tōcah “name” with the right possessor. For the first two, the target answer is one word.",
        items: [
          {
            input: "tōcah",
            target: "word for “my name”",
            answer: "notōcah",
            breakdown: "no-tōcah",
            explanation: "Add no- to make notōcah “my name.” In a full introduction, use Na notōcah plus the name.",
            accepted: ["Na notōcah", "na notōcah"],
          },
          {
            input: "tōcah",
            target: "word for “your name”",
            answer: "motōcah",
            breakdown: "mo-tōcah",
            explanation: "Add mo- to make motōcah “your name.” Use it in the question ¿Quēniuhqui motōcah?",
            accepted: ["Ta motōcah", "ta motōcah"],
          },
          {
            input: "Na notōcah Juana.",
            target: "change the name to Ana",
            answer: "Na notōcah Ana.",
            breakdown: "na no-tōcah Ana",
            explanation: "Keep Na notōcah and replace the personal name.",
            accepted: ["Na notōcah Ana"],
          },
          {
            input: "notōcah",
            target: "ask “what is your name?”",
            answer: "¿Quēniuhqui motōcah?",
            breakdown: "quēniuhqui mo-tōcah",
            explanation: "Use motōcah because you are asking for the other person’s name.",
            accepted: ["Quēniuhqui motōcah", "quēniuhqui motōcah"],
          },
        ],
      },
      {
        kind: "produce",
        heading: "Say it in the name exchange",
        prompt: "Type the Nahuatl sentence from Unit 3.",
        items: [
          {
            english: "My name is Juana.",
            answer: "Na notōcah Juana.",
            breakdown: "na no-tōcah Juana",
            explanation: "Use Na notōcah, then the name.",
            accepted: ["Na notōcah Juana", "notōcah Juana"],
          },
          {
            english: "What is your name?",
            answer: "¿Quēniuhqui motōcah?",
            breakdown: "quēniuhqui mo-tōcah",
            explanation: "Use motōcah because you are asking about “your name.”",
            accepted: ["Quēniuhqui motōcah", "quēniuhqui motōcah"],
          },
          {
            english: "My name is Ana.",
            answer: "Na notōcah Ana.",
            breakdown: "na no-tōcah Ana",
            explanation: "Keep the Unit 3 frame Na notōcah and add the name.",
            accepted: ["Na notōcah Ana", "notōcah Ana"],
          },
          {
            english: "Her/his name is María.",
            answer: "Ītōcah María.",
            breakdown: "ī-tōcah María",
            explanation: "Use ī- for “her/his,” then tōcah and the name.",
            accepted: ["Itōcah María", "Ītōcah María", "itōcah maria"],
          },
          {
            english: "And you, what is your name?",
            answer: "Huan ta, ¿quēniuhqui motōcah?",
            breakdown: "huan ta, quēniuhqui mo-tōcah",
            explanation: "Huan ta means “and you”; motōcah means “your name.”",
            accepted: ["Huan ta quēniuhqui motōcah", "huan ta quēniuhqui motōcah"],
          },
        ],
      },
    ],
  },
  {
    id: "identity-words-introductions",
    unit: 5,
    band: "A1",
    title: "Say Your Role or Job",
    shortDesc: "Build Unit 5 sentences like “I am a student” and “You are a teacher.”",
    pattern: "ni-/ti-/no prefix + role word",
    explanation:
      "In this beginner pattern, the prefix carries the meaning of “I am” or “you are.” Use ni- for “I am,” ti- for “you are,” and no prefix for “she/he is.” This unit uses role words such as momachtiani “student” and tlamachtihquetl “teacher.”",
    examples: [
      {
        nahuatl: "Na nimomachtiani.",
        breakdown: "na ni-momachtiani",
        translation: "I am a student.",
        note: "ni- attached to the role word carries “I am.”",
      },
      {
        nahuatl: "Ta titlamachtihquetl.",
        breakdown: "ta ti-tlamachtihquetl",
        translation: "You are a teacher.",
        note: "ti- attached to the role word carries “you are.”",
      },
      {
        nahuatl: "Ya tequitini.",
        breakdown: "ya tequitini",
        translation: "She/he is a worker.",
        note: "Third person singular uses no added subject prefix in this pattern.",
      },
      {
        nahuatl: "Na nitlamachtia nāhuatl.",
        breakdown: "na ni-tlamachtia nāhuatl",
        translation: "I teach Nahuatl.",
        note: "Unit 5 also practices saying what work someone does with a verb.",
      },
    ],
    drills: [
      {
        kind: "paradigm",
        heading: "role words in introductions",
        prompt: "Read the role forms before typing your own.",
        rows: [
          {
            cue: "I",
            answer: "nimomachtiani",
            breakdown: "ni-momachtiani",
            translation: "I am a student.",
          },
          {
            cue: "you",
            answer: "titlamachtihquetl",
            breakdown: "ti-tlamachtihquetl",
            translation: "You are a teacher.",
          },
          {
            cue: "she/he",
            answer: "tequitini",
            breakdown: "tequitini",
            translation: "She/he is a worker.",
          },
        ],
      },
      {
        kind: "transform",
        heading: "Change who you are talking about",
        prompt: "Keep the role word and change the prefix for the new meaning.",
        items: [
          {
            input: "momachtiani",
            target: "make it “I am a student”",
            answer: "nimomachtiani",
            breakdown: "ni-momachtiani",
            explanation: "Add ni- to momachtiani. The ni- prefix supplies “I am.”",
            accepted: ["na nimomachtiani"],
          },
          {
            input: "tlamachtihquetl",
            target: "make it “you are a teacher”",
            answer: "titlamachtihquetl",
            breakdown: "ti-tlamachtihquetl",
            explanation: "Add ti- to tlamachtihquetl. The ti- prefix supplies “you are.”",
            accepted: ["ta titlamachtihquetl"],
          },
          {
            input: "nitequitini",
            target: "make it “she/he is a worker”",
            answer: "tequitini",
            breakdown: "tequitini",
            explanation: "Remove ni-. Third person singular has no added prefix in this beginner pattern.",
            accepted: ["ya tequitini"],
          },
          {
            input: "tlamachtia",
            target: "make it “I teach”",
            answer: "nitlamachtia",
            breakdown: "ni-tlamachtia",
            explanation: "Unit 5 also uses ni- on verbs such as tlamachtia “teach.”",
          },
        ],
      },
      {
        kind: "produce",
        heading: "Type the role sentence",
        prompt: "Use the Unit 5 role word and the correct prefix. Type only the Nahuatl answer.",
        items: [
          {
            english: "I am a student.",
            answer: "nimomachtiani",
            breakdown: "ni-momachtiani",
            explanation: "Use ni- for “I am,” then momachtiani.",
            accepted: ["na nimomachtiani"],
          },
          {
            english: "You are a teacher.",
            answer: "titlamachtihquetl",
            breakdown: "ti-tlamachtihquetl",
            explanation: "Use ti- for “you are,” then tlamachtihquetl.",
            accepted: ["ta titlamachtihquetl"],
          },
          {
            english: "She/he is a worker.",
            answer: "tequitini",
            breakdown: "tequitini",
            explanation: "For she/he, use tequitini with no added subject prefix.",
            accepted: ["ya tequitini"],
          },
          {
            english: "I teach Nahuatl.",
            answer: "Nitlamachtia nāhuatl.",
            breakdown: "ni-tlamachtia nāhuatl",
            explanation: "Use ni- on the verb tlamachtia, then nāhuatl.",
            accepted: ["Nitlamachtia nahuatl", "nitlamachtia nāhuatl"],
          },
        ],
      },
    ],
  },
  {
    id: "subject-prefixes",
    unit: 6,
    band: "A1",
    title: "Subject Prefixes on Present Verbs",
    shortDesc: "Build present-tense intransitive verbs from person plus stem.",
    pattern: "ni-/ti-/Ø + verb stem; plural adds -h",
    explanation:
      "Beginner guidance: present intransitive verbs use subject prefixes. Singular forms are ni-, ti-, and zero prefix. Plural forms use ti-...-h, an-...-h, and zero-...-h. The same ti- can mean “you” or “we”; the final -h tells you the plural form.",
    examples: [
      {
        nahuatl: "Nitequiti.",
        breakdown: "ni-tequiti",
        translation: "I work.",
        note: "ni- marks first person singular.",
      },
      {
        nahuatl: "Titequiti.",
        breakdown: "ti-tequiti",
        translation: "You work.",
        note: "No final -h, so this is second person singular.",
      },
      {
        nahuatl: "Titequitih.",
        breakdown: "ti-tequiti-h",
        translation: "We work.",
        note: "The same ti- appears, but -h marks plural.",
      },
      {
        nahuatl: "Antequitih.",
        breakdown: "an-tequiti-h",
        translation: "You all work.",
        note: "an- plus -h marks second person plural.",
      },
    ],
    drills: [
      {
        kind: "paradigm",
        heading: "tequiti in the present",
        prompt: "Read the full pattern aloud before typing answers.",
        rows: [
          {
            cue: "I",
            answer: "nitequiti",
            breakdown: "ni-tequiti",
            translation: "I work.",
          },
          {
            cue: "you",
            answer: "titequiti",
            breakdown: "ti-tequiti",
            translation: "You work.",
          },
          {
            cue: "she/he",
            answer: "tequiti",
            breakdown: "tequiti",
            translation: "She/he works.",
          },
          {
            cue: "we",
            answer: "titequitih",
            breakdown: "ti-tequiti-h",
            translation: "We work.",
          },
          {
            cue: "you all",
            answer: "antequitih",
            breakdown: "an-tequiti-h",
            translation: "You all work.",
          },
          {
            cue: "they",
            answer: "tequitih",
            breakdown: "tequiti-h",
            translation: "They work.",
          },
        ],
      },
      {
        kind: "transform",
        heading: "Change the person",
        prompt: "Rewrite the verb for the target person.",
        items: [
          {
            input: "tequiti",
            target: "I",
            answer: "nitequiti",
            breakdown: "ni-tequiti",
            explanation: "Add ni- for first person singular.",
          },
          {
            input: "tequiti",
            target: "we",
            answer: "titequitih",
            breakdown: "ti-tequiti-h",
            explanation: "Use ti- plus final -h for first person plural.",
          },
          {
            input: "titequiti",
            target: "you all",
            answer: "antequitih",
            breakdown: "an-tequiti-h",
            explanation: "Second person plural uses an- at the front and -h at the end.",
          },
        ],
      },
      {
        kind: "produce",
        heading: "Produce the present verb",
        prompt: "Type the Nahuatl form.",
        items: [
          {
            english: "I work.",
            answer: "nitequiti",
            breakdown: "ni-tequiti",
            explanation: "Use ni- with the stem tequiti.",
          },
          {
            english: "They work.",
            answer: "tequitih",
            breakdown: "tequiti-h",
            explanation: "Third person plural has no prefix and adds final -h.",
          },
          {
            english: "You all work.",
            answer: "antequitih",
            breakdown: "an-tequiti-h",
            explanation: "Use an- plus final -h for second person plural.",
          },
        ],
      },
    ],
  },
  {
    id: "possession-prefixes",
    unit: 8,
    band: "A1",
    title: "Possession Prefixes",
    shortDesc: "Build possessed nouns from a possessor prefix and a known stem.",
    pattern: "no-/mo-/i-/to-/amo-/in- + noun stem",
    explanation:
      "Beginner guidance: possessed nouns use a prefix such as no- “my” or mo- “your.” For many nouns, the standalone ending is not used in the possessed form. This lab uses explicit stems that are already safe for beginner practice.",
    examples: [
      {
        nahuatl: "notōcah",
        breakdown: "no-tōcah",
        translation: "my name",
        note: "no- marks first person singular possession.",
      },
      {
        nahuatl: "motōcah",
        breakdown: "mo-tōcah",
        translation: "your name",
        note: "mo- marks second person singular possession.",
      },
      {
        nahuatl: "nocal",
        breakdown: "no-cal",
        translation: "my house",
        note: "calli is practiced with the possessed stem cal-.",
      },
      {
        nahuatl: "tomīllah",
        breakdown: "to-mīllah",
        translation: "our milpa",
        note: "to- marks first person plural possession.",
      },
    ],
    drills: [
      {
        kind: "transform",
        heading: "Add a possessor",
        prompt: "Change the noun into a possessed form.",
        items: [
          {
            input: "calli",
            target: "my house",
            answer: "nocal",
            breakdown: "no-cal",
            explanation: "Use no- plus the possessed stem cal-. The -li ending from calli is not used here.",
          },
          {
            input: "tōcah",
            target: "your name",
            answer: "motōcah",
            breakdown: "mo-tōcah",
            explanation: "Use mo- for second person singular possession.",
          },
          {
            input: "mīllah",
            target: "our milpa",
            answer: "tomīllah",
            breakdown: "to-mīllah",
            explanation: "Use to- for first person plural possession.",
          },
        ],
      },
      {
        kind: "produce",
        heading: "Produce a possessed noun",
        prompt: "Type the Nahuatl possessed form.",
        items: [
          {
            english: "my house",
            answer: "nocal",
            breakdown: "no-cal",
            explanation: "no- means “my,” and cal- is the possessed stem used for house.",
          },
          {
            english: "your name",
            answer: "motōcah",
            breakdown: "mo-tōcah",
            explanation: "mo- means “your” for one person.",
          },
          {
            english: "their name",
            answer: "intōcah",
            breakdown: "in-tōcah",
            explanation: "in- marks third person plural possession in this beginner paradigm.",
          },
        ],
      },
    ],
  },
  {
    id: "present-tense-verbs",
    unit: 6,
    band: "A1",
    title: "Present-Tense Verb Production",
    shortDesc: "Generate present forms from familiar intransitive stems.",
    pattern: "subject prefix + verb stem (+ -h for plural)",
    explanation:
      "Beginner guidance: once you know the stem, present intransitive forms are built with the subject prefix pattern. Plural forms in this lab add final -h.",
    examples: [
      {
        nahuatl: "Nitlamachtia.",
        breakdown: "ni-tlamachtia",
        translation: "I teach.",
        note: "ni- marks first person singular.",
      },
      {
        nahuatl: "Timomachtiah.",
        breakdown: "ti-momachtia-h",
        translation: "We study.",
        note: "ti- plus final -h marks first person plural.",
      },
      {
        nahuatl: "Cōchih.",
        breakdown: "cōchi-h",
        translation: "They sleep.",
        note: "Third person plural has no prefix and adds final -h.",
      },
    ],
    drills: [
      {
        kind: "transform",
        heading: "Build the present form",
        prompt: "Use the target person to produce the verb.",
        items: [
          {
            input: "cōchi",
            target: "I",
            answer: "nicōchi",
            breakdown: "ni-cōchi",
            explanation: "Add ni- to the stem cōchi.",
          },
          {
            input: "momachtia",
            target: "we",
            answer: "timomachtiah",
            breakdown: "ti-momachtia-h",
            explanation: "Use ti- plus final -h for first person plural.",
          },
          {
            input: "tlamachtia",
            target: "you all",
            answer: "antlamachtiah",
            breakdown: "an-tlamachtia-h",
            explanation: "Use an- plus final -h for second person plural.",
          },
        ],
      },
      {
        kind: "produce",
        heading: "Produce the present verb",
        prompt: "Type the Nahuatl sentence form.",
        items: [
          {
            english: "I teach.",
            answer: "nitlamachtia",
            breakdown: "ni-tlamachtia",
            explanation: "Use ni- with tlamachtia.",
          },
          {
            english: "We study.",
            answer: "timomachtiah",
            breakdown: "ti-momachtia-h",
            explanation: "First person plural uses ti- and final -h.",
          },
          {
            english: "They sleep.",
            answer: "cōchih",
            breakdown: "cōchi-h",
            explanation: "Third person plural has no prefix and adds -h.",
          },
        ],
      },
    ],
  },
  {
    id: "family-possession",
    unit: 9,
    band: "A1",
    title: "Family Words with My/Your/Her/His",
    shortDesc: "Practice Unit 9 family forms such as inana, itata, and iicni.",
    pattern: "no-/mo-/i- + family word",
    explanation:
      "Family words often appear with a possessive prefix. For beginner production, practice the explicit forms shown here instead of guessing new family terms. Use no- for “my,” mo- for “your,” and i- for “her/his.”",
    examples: [
      {
        nahuatl: "nonana",
        breakdown: "no-nana",
        translation: "my mother",
        note: "no- means “my.”",
      },
      {
        nahuatl: "motata",
        breakdown: "mo-tata",
        translation: "your father",
        note: "mo- means “your” for one person.",
      },
      {
        nahuatl: "iicni",
        breakdown: "i-icni",
        translation: "her/his sibling",
        note: "i- marks her/his possession in this Unit 9 form.",
      },
      {
        nahuatl: "inana",
        breakdown: "i-nana",
        translation: "her/his mother",
        note: "This is a practiced Unit 9 vocabulary item.",
      },
    ],
    drills: [
      {
        kind: "identify",
        heading: "Find the possessor",
        prompt: "Type the English possessor shown by the prefix.",
        items: [
          {
            prompt: "nonana",
            answer: "my",
            explanation: "The prefix no- means “my.”",
          },
          {
            prompt: "motata",
            answer: "your",
            explanation: "The prefix mo- means “your” for one person.",
          },
          {
            prompt: "iicni",
            answer: "her/his",
            explanation: "The prefix i- means “her/his.”",
          },
        ],
      },
      {
        kind: "transform",
        heading: "Change the family possessor",
        prompt: "Build the family word for the target meaning.",
        items: [
          {
            input: "nana",
            target: "my mother",
            answer: "nonana",
            breakdown: "no-nana",
            explanation: "Add no- for “my.”",
          },
          {
            input: "tata",
            target: "your father",
            answer: "motata",
            breakdown: "mo-tata",
            explanation: "Add mo- for “your.”",
          },
          {
            input: "icni",
            target: "her/his sibling",
            answer: "iicni",
            breakdown: "i-icni",
            explanation: "Add i- for “her/his.” The written form is iicni.",
          },
        ],
      },
      {
        kind: "produce",
        heading: "Produce a family phrase",
        prompt: "Type the Nahuatl family phrase.",
        items: [
          {
            english: "my mother",
            answer: "nonana",
            breakdown: "no-nana",
            explanation: "no- means “my,” and nana is the practiced mother word.",
          },
          {
            english: "your father",
            answer: "motata",
            breakdown: "mo-tata",
            explanation: "mo- means “your,” and tata is the practiced father word.",
          },
          {
            english: "her/his sibling",
            answer: "iicni",
            breakdown: "i-icni",
            explanation: "i- means “her/his,” and icni is the sibling word practiced here.",
            accepted: ["īicni"],
          },
        ],
      },
    ],
  },
  {
    id: "future-tense",
    unit: 12,
    band: "A1",
    title: "Future Tense",
    shortDesc: "Add the app’s beginner future suffixes to familiar verb forms.",
    pattern: "subject prefix + future stem + -z / -zqueh",
    explanation:
      "Beginner guidance: this app represents the future with -z for singular forms and -zqueh for plural forms. Some verbs have stem changes, so this lab keeps to explicit forms already shown to learners.",
    examples: [
      {
        nahuatl: "Nitequitiz.",
        breakdown: "ni-tequiti-z",
        translation: "I will work.",
        note: "-z marks a singular future form.",
      },
      {
        nahuatl: "Titequitizqueh.",
        breakdown: "ti-tequiti-zqueh",
        translation: "We will work.",
        note: "-zqueh marks a plural future form.",
      },
      {
        nahuatl: "Nitlahtōz.",
        breakdown: "ni-tlahtō-z",
        translation: "I will speak.",
        note: "This is an explicit practice form from the app grammar.",
      },
    ],
    drills: [
      {
        kind: "transform",
        heading: "Make it future",
        prompt: "Change the present cue into the future form.",
        items: [
          {
            input: "nitequiti",
            target: "future",
            answer: "nitequitiz",
            breakdown: "ni-tequiti-z",
            explanation: "Add -z to the singular future form.",
          },
          {
            input: "titequitih",
            target: "future",
            answer: "titequitizqueh",
            breakdown: "ti-tequiti-zqueh",
            explanation: "Use -zqueh for the plural future form shown in the app grammar.",
          },
          {
            input: "nitlahtoa",
            target: "future",
            answer: "nitlahtōz",
            breakdown: "ni-tlahtō-z",
            explanation: "Use the explicit future form nitlahtōz rather than guessing from spelling alone.",
          },
        ],
      },
      {
        kind: "produce",
        heading: "Produce the future",
        prompt: "Type the Nahuatl future form.",
        items: [
          {
            english: "I will work.",
            answer: "nitequitiz",
            breakdown: "ni-tequiti-z",
            explanation: "The subject is ni-, and the future suffix is -z.",
          },
          {
            english: "They will work.",
            answer: "tequitizqueh",
            breakdown: "tequiti-zqueh",
            explanation: "Third person plural has no prefix and uses -zqueh.",
          },
          {
            english: "I will speak.",
            answer: "nitlahtōz",
            breakdown: "ni-tlahtō-z",
            explanation: "This lab uses the explicit app form nitlahtōz.",
          },
        ],
      },
    ],
  },
  {
    id: "object-prefixes",
    unit: 13,
    band: "A1",
    title: "Object Prefixes",
    shortDesc: "Distinguish the subject prefix from the direct-object prefix.",
    pattern: "subject prefix + object prefix + verb stem",
    explanation:
      "Beginner guidance: transitive verbs can mark a specific direct object inside the verb. This lab focuses on conservative 3rd-person object forms c-/qui- with familiar verbs.",
    examples: [
      {
        nahuatl: "Niccua.",
        breakdown: "ni-c-cua",
        translation: "I eat it.",
        note: "ni- is the subject; c- is the object.",
      },
      {
        nahuatl: "Ticcua.",
        breakdown: "ti-c-cua",
        translation: "You eat it.",
        note: "ti- marks the subject and c- marks the object.",
      },
      {
        nahuatl: "Quicua.",
        breakdown: "qui-cua",
        translation: "She/he eats it.",
        note: "In third person subject forms, qui- marks the object here.",
      },
    ],
    drills: [
      {
        kind: "transform",
        heading: "Combine the pieces",
        prompt: "Build the verb from subject, object, and stem.",
        items: [
          {
            input: "ni- + c- + cua",
            target: "combine",
            answer: "niccua",
            breakdown: "ni-c-cua",
            explanation: "ni- marks “I,” and c- marks the object “it.”",
          },
          {
            input: "ti- + c- + chīhua",
            target: "combine",
            answer: "ticchīhua",
            breakdown: "ti-c-chīhua",
            explanation: "The subject prefix ti- comes before the object prefix c-.",
          },
          {
            input: "qui- + cua",
            target: "third person subject",
            answer: "quicua",
            breakdown: "qui-cua",
            explanation: "For this beginner pattern, qui- marks a 3rd-person object with a 3rd-person subject.",
          },
        ],
      },
      {
        kind: "produce",
        heading: "Produce a transitive form",
        prompt: "Type the Nahuatl form.",
        items: [
          {
            english: "I eat it.",
            answer: "niccua",
            breakdown: "ni-c-cua",
            explanation: "Use ni- for the subject and c- for the direct object.",
          },
          {
            english: "You make it.",
            answer: "ticchīhua",
            breakdown: "ti-c-chīhua",
            explanation: "Use ti- for “you” and c- for “it.”",
          },
          {
            english: "She/he eats it.",
            answer: "quicua",
            breakdown: "qui-cua",
            explanation: "Use the explicit 3rd-person object form qui- with cua.",
          },
        ],
      },
    ],
  },
  {
    id: "past-tense",
    unit: 14,
    band: "A2",
    title: "Completed Actions",
    shortDesc: "Practice the app’s beginner completed-action pattern.",
    pattern: "ō- + subject/object prefixes + explicit past stem",
    explanation:
      "Beginner guidance: completed actions use ō- before the verb. Many verbs also change their stem in the past, so this lab practices explicit high-confidence forms instead of asking you to infer new stems.",
    examples: [
      {
        nahuatl: "Ōnihuetz.",
        breakdown: "ō-ni-huetz",
        translation: "I fell.",
        note: "ō- marks completed action.",
      },
      {
        nahuatl: "Ōtihuetz.",
        breakdown: "ō-ti-huetz",
        translation: "You fell.",
        note: "The subject prefix comes after ō-.",
      },
      {
        nahuatl: "Ōquicuac.",
        breakdown: "ō-qui-cua-c",
        translation: "She/he ate it.",
        note: "This is an explicit past form for cua with an object prefix.",
      },
    ],
    drills: [
      {
        kind: "transform",
        heading: "Mark completed action",
        prompt: "Change the cue into the completed-action form.",
        items: [
          {
            input: "nihuetz",
            target: "completed action",
            answer: "ōnihuetz",
            breakdown: "ō-ni-huetz",
            explanation: "Add ō- before the subject prefix.",
          },
          {
            input: "tihuetz",
            target: "completed action",
            answer: "ōtihuetz",
            breakdown: "ō-ti-huetz",
            explanation: "The completed-action marker ō- comes first.",
          },
          {
            input: "quicua",
            target: "completed action",
            answer: "ōquicuac",
            breakdown: "ō-qui-cua-c",
            explanation: "Use the explicit past form cuac with ō- at the front.",
          },
        ],
      },
      {
        kind: "produce",
        heading: "Produce the past form",
        prompt: "Type the Nahuatl completed-action form.",
        items: [
          {
            english: "I fell.",
            answer: "ōnihuetz",
            breakdown: "ō-ni-huetz",
            explanation: "Use ō- before nihuetz.",
          },
          {
            english: "I came back.",
            answer: "ōnicuēp",
            breakdown: "ō-ni-cuēp",
            explanation: "This lab uses the explicit past form ōnicuēp.",
          },
          {
            english: "She/he ate it.",
            answer: "ōquicuac",
            breakdown: "ō-qui-cua-c",
            explanation: "Use ō- plus the explicit past transitive form quicuac.",
          },
        ],
      },
    ],
  },
  {
    id: "respect-affection",
    unit: 20,
    band: "A1",
    title: "Respect and Affection: -tzin and -pil",
    shortDesc: "Recognize and conservatively produce respectful or affectionate forms.",
    pattern: "known base/stem + -tzin or -pil",
    explanation:
      "Beginner guidance: -tzin can add respect or affection, and -pil can add smallness or tenderness. These suffixes are socially meaningful, so this lab keeps production to simple forms already suited to beginner practice.",
    examples: [
      {
        nahuatl: "cihuātzin",
        breakdown: "cihuā-tzin",
        translation: "respected woman; ma’am",
        note: "-tzin adds respect or affection.",
      },
      {
        nahuatl: "nopiltzin",
        breakdown: "no-pil-tzin",
        translation: "my dear child",
        note: "no- marks “my,” and -tzin adds tenderness.",
      },
      {
        nahuatl: "calpil",
        breakdown: "cal-pil",
        translation: "little house",
        note: "-pil adds smallness or affection in this practice form.",
      },
    ],
    drills: [
      {
        kind: "transform",
        heading: "Add respect or affection",
        prompt: "Change the base into the requested form.",
        items: [
          {
            input: "cihuātl",
            target: "respectful address",
            answer: "cihuātzin",
            breakdown: "cihuā-tzin",
            explanation: "Use the stem cihuā- with -tzin.",
          },
          {
            input: "nopil",
            target: "affectionate",
            answer: "nopiltzin",
            breakdown: "no-pil-tzin",
            explanation: "Add -tzin to the possessed base nopil.",
          },
          {
            input: "calli",
            target: "little/dear house",
            answer: "calpil",
            breakdown: "cal-pil",
            explanation: "Use the stem cal- with -pil for this beginner practice form.",
          },
        ],
      },
      {
        kind: "produce",
        heading: "Produce a respectful form",
        prompt: "Type the Nahuatl form.",
        items: [
          {
            english: "respected woman; ma’am",
            answer: "cihuātzin",
            breakdown: "cihuā-tzin",
            explanation: "Add -tzin to the stem cihuā-.",
          },
          {
            english: "my dear child",
            answer: "nopiltzin",
            breakdown: "no-pil-tzin",
            explanation: "no- marks possession, and -tzin adds affection.",
          },
          {
            english: "little house",
            answer: "calpil",
            breakdown: "cal-pil",
            explanation: "Use cal- plus -pil.",
          },
        ],
      },
    ],
  },
  {
    id: "conditionals",
    unit: 30,
    band: "A1",
    title: "Conditionals with intla",
    shortDesc: "Build simple if/then sentences with familiar present forms.",
    pattern: "intla + condition, result",
    explanation:
      "Beginner guidance: intla means “if.” This lab practices short sentences where both clauses use forms you already know. The goal is to combine clauses clearly, not to create complex hypothetical grammar.",
    examples: [
      {
        nahuatl: "Intla nitequiti, nitlacua.",
        breakdown: "intla ni-tequiti, ni-tlacua",
        translation: "If I work, I eat.",
        note: "intla introduces the condition.",
      },
      {
        nahuatl: "Intla tiyāuh, niyāuh.",
        breakdown: "intla ti-yāuh, ni-yāuh",
        translation: "If you go, I go.",
        note: "Each clause keeps its own subject prefix.",
      },
      {
        nahuatl: "Intla tequitih, titequitih.",
        breakdown: "intla tequiti-h, ti-tequiti-h",
        translation: "If they work, we work.",
        note: "Both verbs are plural present forms.",
      },
    ],
    drills: [
      {
        kind: "transform",
        heading: "Add intla",
        prompt: "Combine the condition and result into one sentence.",
        items: [
          {
            input: "nitequiti + nitlacua",
            target: "if I work, I eat",
            answer: "Intla nitequiti, nitlacua.",
            breakdown: "intla ni-tequiti, ni-tlacua",
            explanation: "Place intla before the condition, then give the result after the comma.",
            accepted: ["Intla nitequiti nitlacua", "intla nitequiti, nitlacua"],
          },
          {
            input: "tiyāuh + niyāuh",
            target: "if you go, I go",
            answer: "Intla tiyāuh, niyāuh.",
            breakdown: "intla ti-yāuh, ni-yāuh",
            explanation: "Each clause keeps its own subject prefix.",
            accepted: ["Intla tiyāuh niyāuh", "intla tiyāuh, niyāuh"],
          },
          {
            input: "tequitih + titequitih",
            target: "if they work, we work",
            answer: "Intla tequitih, titequitih.",
            breakdown: "intla tequiti-h, ti-tequiti-h",
            explanation: "The condition uses tequitih, and the result uses titequitih.",
            accepted: ["Intla tequitih titequitih", "intla tequitih, titequitih"],
          },
        ],
      },
      {
        kind: "produce",
        heading: "Produce an if/then sentence",
        prompt: "Type the Nahuatl sentence.",
        items: [
          {
            english: "If I work, I eat.",
            answer: "Intla nitequiti, nitlacua.",
            breakdown: "intla ni-tequiti, ni-tlacua",
            explanation: "Use intla before the condition nitequiti.",
            accepted: ["Intla nitequiti nitlacua", "intla nitequiti, nitlacua"],
          },
          {
            english: "If you go, I go.",
            answer: "Intla tiyāuh, niyāuh.",
            breakdown: "intla ti-yāuh, ni-yāuh",
            explanation: "Use ti- in the condition and ni- in the result.",
            accepted: ["Intla tiyāuh niyāuh", "intla tiyāuh, niyāuh"],
          },
          {
            english: "If they work, we work.",
            answer: "Intla tequitih, titequitih.",
            breakdown: "intla tequiti-h, ti-tequiti-h",
            explanation: "Both clauses use plural present forms.",
            accepted: ["Intla tequitih titequitih", "intla tequitih, titequitih"],
          },
        ],
      },
    ],
  },
];

export function getGrammarLab(id: string): GrammarLab | null {
  return GRAMMAR_LABS.find((lab) => lab.id === id) ?? null;
}

export function getGrammarLabsForUnit(unit: number): GrammarLab[] {
  return GRAMMAR_LABS.filter((lab) => lab.unit === unit);
}
