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
    id: "noun-stems-absolutives",
    unit: 3,
    band: "A1",
    title: "Noun Stems and Absolutive Endings",
    shortDesc: "Practice seeing a noun as stem plus ending.",
    pattern: "noun stem + absolutive ending",
    explanation:
      "Beginner guidance: many unpossessed nouns appear with an absolutive ending such as -tl, -tli, -li, or -n. Learn the full noun as the dictionary form, but also practice noticing the stem underneath. The ending is not a universal rule for every noun, and some words are better learned as fixed forms.",
    examples: [
      {
        nahuatl: "cihuātl",
        breakdown: "cihuā-tl",
        translation: "woman",
        note: "-tl is the visible absolutive ending; cihuā- is the stem used in simple plural practice.",
      },
      {
        nahuatl: "cīntli",
        breakdown: "cīn-tli",
        translation: "ear of corn",
        note: "-tli is part of the unpossessed noun form.",
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
        note: "This lab asks you to identify pieces, not to infer every possible noun form.",
      },
    ],
    drills: [
      {
        kind: "identify",
        heading: "Find the ending",
        prompt: "Type the absolutive ending shown in each noun.",
        items: [
          {
            prompt: "cihuātl",
            answer: "-tl",
            explanation: "cihuātl can be split as cihuā-tl, with -tl at the end.",
          },
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
        prompt: "Build the noun from the stem and the ending.",
        items: [
          {
            input: "cihuā- + -tl",
            target: "make the unpossessed noun",
            answer: "cihuātl",
            breakdown: "cihuā + tl",
            explanation: "The stem cihuā- combines with -tl to give cihuātl.",
          },
          {
            input: "cīn- + -tli",
            target: "make the unpossessed noun",
            answer: "cīntli",
            breakdown: "cīn + tli",
            explanation: "The stem cīn- combines with -tli to give cīntli.",
          },
          {
            input: "cal- + -li",
            target: "make the unpossessed noun",
            answer: "calli",
            breakdown: "cal + li",
            explanation: "The final l of the stem sits next to -li, producing calli.",
          },
        ],
      },
      {
        kind: "produce",
        heading: "Name the stem",
        prompt: "Type the stem you would keep for beginner analysis.",
        items: [
          {
            english: "stem of cihuātl",
            answer: "cihuā",
            breakdown: "cihuā-tl",
            explanation: "Remove the visible -tl ending to see the stem cihuā-.",
            accepted: ["cihuā-"],
          },
          {
            english: "stem of calli",
            answer: "cal",
            breakdown: "cal-li",
            explanation: "The learner stem shown here is cal-, useful for forms such as nocal.",
            accepted: ["cal-"],
          },
        ],
      },
    ],
  },
  {
    id: "noun-predicates-no-copula",
    unit: 3,
    band: "A1",
    title: "Noun Predicates Without a Copula",
    shortDesc: "Use a noun as a sentence without inventing a verb for “is.”",
    pattern: "subject prefix + noun predicate",
    explanation:
      "Beginner guidance: a noun can stand as the predicate of a simple sentence. cihuātl can mean “woman” as a noun, or “she/he is a woman” in the right sentence context. Nahuatl does not need a simple invented copula verb for this pattern.",
    examples: [
      {
        nahuatl: "Cihuātl.",
        breakdown: "cihuā-tl",
        translation: "She/he is a woman.",
        note: "Third person has no spoken subject prefix here.",
      },
      {
        nahuatl: "Nicihuātl.",
        breakdown: "ni-cihuā-tl",
        translation: "I am a woman.",
        note: "ni- marks first person singular on this noun predicate.",
      },
      {
        nahuatl: "Timācēhualli.",
        breakdown: "ti-mācēhualli",
        translation: "You are an Indigenous person.",
        note: "ti- marks second person singular.",
      },
    ],
    drills: [
      {
        kind: "paradigm",
        heading: "cihuātl as a predicate",
        prompt: "Study the singular forms before producing your own.",
        rows: [
          {
            cue: "I",
            answer: "nicihuātl",
            breakdown: "ni-cihuātl",
            translation: "I am a woman.",
          },
          {
            cue: "you",
            answer: "ticihuātl",
            breakdown: "ti-cihuātl",
            translation: "You are a woman.",
          },
          {
            cue: "she/he",
            answer: "cihuātl",
            breakdown: "cihuātl",
            translation: "She/he is a woman.",
          },
        ],
      },
      {
        kind: "transform",
        heading: "Change the subject",
        prompt: "Rewrite the noun predicate for the new subject.",
        items: [
          {
            input: "cihuātl",
            target: "I",
            answer: "nicihuātl",
            breakdown: "ni-cihuātl",
            explanation: "Add ni- for “I”; do not add a separate word for “am.”",
          },
          {
            input: "cihuātl",
            target: "you",
            answer: "ticihuātl",
            breakdown: "ti-cihuātl",
            explanation: "Add ti- for “you”; the noun remains the predicate.",
          },
          {
            input: "nimācēhualli",
            target: "she/he",
            answer: "mācēhualli",
            breakdown: "mācēhualli",
            explanation: "Third person singular has no subject prefix in this beginner pattern.",
          },
        ],
      },
      {
        kind: "produce",
        heading: "Produce the sentence",
        prompt: "Type the Nahuatl noun predicate.",
        items: [
          {
            english: "I am a woman.",
            answer: "nicihuātl",
            breakdown: "ni-cihuātl",
            explanation: "Use ni- plus the noun predicate cihuātl.",
          },
          {
            english: "You are an Indigenous person.",
            answer: "timācēhualli",
            breakdown: "ti-mācēhualli",
            explanation: "Use ti- plus mācēhualli. No separate “to be” verb is needed.",
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
];

export function getGrammarLab(id: string): GrammarLab | null {
  return GRAMMAR_LABS.find((lab) => lab.id === id) ?? null;
}

export function getGrammarLabsForUnit(unit: number): GrammarLab[] {
  return GRAMMAR_LABS.filter((lab) => lab.unit === unit);
}
