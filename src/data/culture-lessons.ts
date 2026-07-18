export type CultureSource = {
  title: string;
  institution: string;
  url: string;
  note: string;
};

export type CultureImage = {
  src: string;
  alt: string;
  title: string;
  creator: string;
  date: string;
  institution: string;
  license: string;
  objectUrl: string;
};

export type CultureSection = {
  title: string;
  paragraphs: string[];
  points?: string[];
};

export type CultureModule = {
  slug: string;
  number: number;
  icon: "city" | "world" | "language" | "region" | "sources";
  title: string;
  shortTitle: string;
  summary: string;
  duration: string;
  distinction: string;
  takeaways: string[];
  image?: CultureImage;
  sections: CultureSection[];
  sources: CultureSource[];
};

export const CULTURE_TIMELINE = [
  {
    date: "c. 1325",
    title: "Mexico-Tenochtitlan",
    body: "The conventional founding date preserved in Mexica historical tradition.",
  },
  {
    date: "1428",
    title: "The Triple Alliance",
    body: "Tenochtitlan, Texcoco, and Tlacopan form the political alliance behind later imperial expansion.",
  },
  {
    date: "1521",
    title: "Siege and conquest",
    body: "A Spanish-led Indigenous coalition defeats Tenochtitlan after war, epidemic disease, and siege.",
  },
  {
    date: "16th-17th c.",
    title: "A vast written archive",
    body: "Nahua writers use alphabetic Nahuatl alongside pictorial and glyphic traditions.",
  },
  {
    date: "Today",
    title: "Living Nahuatl worlds",
    body: "Distinct Nahuatl varieties continue in communities across Mexico and beyond.",
  },
] as const;

const MEXICA_SERPENT: CultureImage = {
  src: "/culture/mexica-coiled-serpent.jpg",
  alt: "A compact Mexica stone sculpture of a coiled serpent.",
  title: "Coiled serpent",
  creator: "Mexica artist",
  date: "1325-1521 CE",
  institution: "The Metropolitan Museum of Art",
  license: "Public Domain (CC0)",
  objectUrl: "https://www.metmuseum.org/art/collection/search/307635",
};

const NAHUA_ALTAR: CultureImage = {
  src: "/culture/nahua-sun-warrior-altar.jpg",
  alt: "A carved Nahua stone altar with a solar disk and bird imagery.",
  title: "Altar to the Sun Warrior",
  creator: "Nahua artist or artists",
  date: "1450-1521 CE",
  institution: "The Metropolitan Museum of Art",
  license: "Public Domain (CC0)",
  objectUrl: "https://www.metmuseum.org/art/collection/search/318674",
};

export const CULTURE_MODULES: CultureModule[] = [
  {
    slug: "mexica-and-tenochtitlan",
    number: 1,
    icon: "city",
    title: "The Mexica and Tenochtitlan",
    shortTitle: "Mexica & Tenochtitlan",
    summary:
      "Meet the people and city most often called Aztec, then examine urban life, political power, tribute, and the coalition that defeated Tenochtitlan in 1521.",
    duration: "10 min",
    distinction:
      "Mexica history belongs within Nahua history, but it is not the history of every Nahua people or every Nahuatl-speaking community.",
    takeaways: [
      "Mexica is the precise name for the people centered on Tenochtitlan and Tlatelolco.",
      "Their empire was an alliance-led tributary system, not a modern nation-state.",
      "The conquest of 1521 was a conflict involving many Indigenous polities, not a two-sided story.",
    ],
    image: MEXICA_SERPENT,
    sections: [
      {
        title: "Names, traditions, and historical scope",
        paragraphs: [
          "Mexica is the most precise term for the Nahua people whose principal cities were Mexico-Tenochtitlan and Mexico-Tlatelolco. Tenochca can refer more specifically to people of Tenochtitlan. Aztec is a familiar modern label connected to the migration tradition of Aztlán, but it is often used so broadly that it blurs important differences among peoples and periods.",
          "Mexica accounts described a migration guided by Huitzilopochtli and a founding on an island in Lake Texcoco. Historians treat that account as a political and sacred origin tradition, not as a simple travel diary. The conventional founding date of Tenochtitlan is 1325, while the city and its institutions developed over generations.",
        ],
      },
      {
        title: "A lake city and a center of power",
        paragraphs: [
          "Tenochtitlan grew into a dense lake-city connected by causeways, canals, markets, temples, neighborhoods, and systems for moving water and goods. Its scale depended on skilled labor, long-distance exchange, chinampa agriculture around the lakes, and tribute from communities drawn into its political orbit.",
          "After 1428, Tenochtitlan joined Texcoco and Tlacopan in the Triple Alliance. Tenochtitlan became the dominant partner as the alliance expanded. Subject communities often retained local rulers and institutions while owing goods, labor, or military obligations. That is why tributary empire is usually more accurate than imagining one uniform Mexica state covering every conquered place.",
        ],
      },
      {
        title: "Everyday life was not one experience",
        paragraphs: [
          "Farmers, market sellers, craft specialists, porters, warriors, priests, rulers, and enslaved people lived within an unequal society. Sources distinguish hereditary nobles, often called pipiltin, from commoner households, often called macehualtin, while status, occupation, gender, neighborhood, age, and political circumstance shaped daily life in more complicated ways.",
          "A serious history cannot reduce Mexica culture to warfare and sacrifice. Food production, textile work, education, law, trade, family obligations, ritual calendars, poetry, music, and diplomatic speech were also central. Nor should sophistication erase coercion: imperial expansion brought tribute demands and conflict to other peoples.",
        ],
      },
      {
        title: "1521 without a simple conquest story",
        paragraphs: [
          "The fall of Tenochtitlan followed years of political maneuvering, open war, epidemic disease, and a devastating siege. Spaniards did not act alone. Large Indigenous forces, including Tlaxcalteca and other allies with their own goals and grievances, were indispensable to the campaign against the Mexica-led order.",
          "The defeat of the city did not make Nahua people disappear. Communities rebuilt institutions under colonial rule, defended lands in court, composed histories, adapted religious practices, and continued speaking and writing Nahuatl. Conquest marks a rupture in political power, not the end of Nahua history.",
        ],
      },
    ],
    sources: [
      {
        title: "Sala Mexica, Museo Nacional de Antropología",
        institution: "INAH",
        url: "https://lugares.inah.gob.mx/es/node/4237",
        note: "Institutional overview of Mexica history, expansion, and material culture.",
      },
      {
        title: "Mito de la peregrinación",
        institution: "Museo del Templo Mayor, INAH",
        url: "https://www.templomayor.inah.gob.mx/historia/mito-de-la-peregrinacion",
        note: "The migration tradition and the conventional founding date of Tenochtitlan.",
      },
      {
        title: "1519-1521: alianzas, confrontación y conquistas",
        institution: "INAH",
        url: "https://mexicograndezaydiversidad.inah.gob.mx/publicacion/capitulo-07.html",
        note: "A multi-polity account of alliances and conflict during the conquest.",
      },
      {
        title: "Tenochtitlan: apuntes sobre su historia",
        institution: "INAH / Museo del Templo Mayor",
        url: "https://inah.gob.mx/boletines/nuevo-libro-gratuito-acerca-la-historia-de-tenochtitlan-al-publico",
        note: "A recent institutional synthesis of the city, government, society, and women in Mexica life.",
      },
    ],
  },
  {
    slug: "wider-nahua-world",
    number: 2,
    icon: "world",
    title: "The Wider Nahua World",
    shortTitle: "A Wider Nahua World",
    summary:
      "Move beyond the idea that Mexica, Nahua, and Aztec are interchangeable. Shared language existed alongside distinct cities, rivalries, alliances, and local identities.",
    duration: "8 min",
    distinction:
      "Speaking a Nahuatl variety did not make every community Mexica, politically united, or culturally identical.",
    takeaways: [
      "Nahua is broader than Mexica.",
      "The altepetl was a central unit of local political and social belonging.",
      "Alliance, rivalry, migration, and local continuity all shaped Nahua history.",
    ],
    image: NAHUA_ALTAR,
    sections: [
      {
        title: "Language did not erase local identity",
        paragraphs: [
          "Nahua peoples lived across many communities and regions. They spoke related varieties, shared some political and ritual concepts, and participated in overlapping networks of trade and migration. None of that created a single timeless Nahua nation with one ruler, one culture, or one historical experience.",
          "Local belonging often centered on the altepetl: a named community with its own territory, leadership, sacred places, and internal organization. An altepetl could cooperate with neighbors, fight them, enter an alliance, pay tribute, or divide into rival factions. Language was one layer of identity among several.",
        ],
      },
      {
        title: "Many centers, not one capital for everyone",
        paragraphs: [
          "Tenochtitlan was enormously powerful in the fifteenth and early sixteenth centuries, but it was not the only Nahua center. Texcoco, Tlaxcala, Huexotzinco, Cholula, and many other polities pursued their own political projects. Some were allies of the Mexica, some were subjects, and some remained determined rivals.",
          "Even inside the Triple Alliance, Tenochtitlan, Texcoco, and Tlacopan were distinct partners. Their relationship shifted as Tenochtitlan accumulated power. Treating every Nahua achievement as Aztec therefore gives one capital credit for histories created across a much wider world.",
        ],
      },
      {
        title: "Empire, tribute, and resistance",
        paragraphs: [
          "Mexica-led expansion connected distant regions through tribute, commerce, warfare, and diplomacy. Those connections could circulate goods and ideas, but they also imposed unequal obligations. Communities responded differently: some negotiated, some collaborated, some rebelled, and some used rival powers against one another.",
          "This political landscape helps explain why so many Indigenous forces joined the campaign against Tenochtitlan. Their participation was not evidence that they lacked agency or identity. It reflected decisions made within existing conflicts, although the colonial order that followed did not produce the outcomes many allies may have expected.",
        ],
      },
      {
        title: "Nahua histories continued after the empire",
        paragraphs: [
          "Colonial-era Nahua communities produced municipal records, annals, land documents, wills, petitions, religious texts, and local histories. These archives show people defending community interests and interpreting new conditions through local institutions and languages.",
          "Modern Nahua identities descend from many regional histories, not from a single line out of Tenochtitlan. A learner can value Mexica history while also asking whose community, whose variety, and whose political experience a source actually describes.",
        ],
      },
    ],
    sources: [
      {
        title: "1519-1521: alianzas, confrontación y conquistas",
        institution: "INAH",
        url: "https://mexicograndezaydiversidad.inah.gob.mx/publicacion/capitulo-07.html",
        note: "Regional political relationships and the Indigenous alliances of the conquest period.",
      },
      {
        title: "Nahua / Nahuatl",
        institution: "INPI",
        url: "https://catalogo.inpi.gob.mx/nahua-nahuatl/",
        note: "National catalogue entry emphasizing contemporary Nahua peoples and regional diversity.",
      },
      {
        title: "Altar to the Sun Warrior",
        institution: "The Metropolitan Museum of Art",
        url: "https://www.metmuseum.org/art/collection/search/318674",
        note: "A public-domain Nahua object from Puebla, useful precisely because Nahua art is not limited to Tenochtitlan.",
      },
    ],
  },
  {
    slug: "nahuatl-through-time",
    number: 3,
    icon: "language",
    title: "Nahuatl Through Time",
    shortTitle: "Nahuatl Through Time",
    summary:
      "Follow Nahuatl from pictorial and glyphic records through colonial alphabetic writing to the living regional varieties spoken today.",
    duration: "9 min",
    distinction:
      "Classical Nahuatl is a historical and scholarly category. It is not a more authentic name for every modern Nahuatl variety, including Eastern Huasteca Nahuatl.",
    takeaways: [
      "Nahua writing has both pictorial-glyphic and alphabetic histories.",
      "Colonial written Nahuatl reflects variation, institutions, and unequal encounters.",
      "Modern varieties have their own sound systems, grammar, vocabulary, and writing practices.",
    ],
    sections: [
      {
        title: "Writing before the Latin alphabet",
        paragraphs: [
          "Nahua peoples recorded names, places, dates, tribute, genealogy, ritual knowledge, and historical sequences through visual systems that combined images, conventional signs, and glyphic writing. These documents were not merely illustrations. Their arrangement and signs carried structured information for trained readers and performers.",
          "The colonial introduction of Latin letters did not instantly replace older systems. Pictorial and glyphic practices continued, while alphabetic writing created additional ways to record speech and argument. Some documents deliberately combine all of them.",
        ],
      },
      {
        title: "Nahua writers made alphabetic writing their own",
        paragraphs: [
          "Missionaries helped adapt Latin letters to Nahuatl for evangelization, grammar, and dictionaries. Nahua writers also learned and appropriated alphabetic writing for their own purposes: local histories, government records, land claims, petitions, wills, songs, speeches, and correspondence.",
          "That archive is invaluable, but it was produced under colonial conditions. Genre, patronage, intended audience, local speech, and the goals of scribes or editors all matter. A dictionary or grammar can document language while still reflecting the categories and pressures of its makers.",
        ],
      },
      {
        title: "What scholars call Classical Nahuatl",
        paragraphs: [
          "Classical Nahuatl commonly refers to well-documented central Mexican written varieties of the early colonial period. It is a useful scholarly convention, not proof that all Nahua people once spoke one perfectly uniform standard. Researchers can identify variation even within famous missionary dictionaries and historical chronicles.",
          "Older spellings also differ from one author to another. They may mark sounds in ways designed for Spanish-literate readers, omit distinctions, or represent a learned written register. Historical forms deserve study, but they should not automatically replace the forms used by a living community.",
        ],
      },
      {
        title: "A family of living regional varieties",
        paragraphs: [
          "INALI recognizes multiple Nahuatl variants and specifically lists Nahuatl of the Huasteca of Veracruz. Modern varieties differ in pronunciation, vocabulary, grammar, and preferred orthographies. They remain related, but a form from a central colonial document may not be the ordinary conversational form in Chicontepec.",
          "Itzli therefore keeps its language curriculum centered on Eastern Huasteca Nahuatl and uses a practical INALI-style spelling. Historical materials appear here to deepen understanding, not to overwrite contemporary speech or turn Classical Nahuatl into a universal correction key.",
        ],
      },
    ],
    sources: [
      {
        title: "El náhuatl posee una larga historia como lengua escrita",
        institution: "Estudios de Cultura Náhuatl, UNAM",
        url: "https://nahuatl.historicas.unam.mx/index.php/ecn/article/view/78800/69785",
        note: "Overview of pictorial-glyphic writing, alphabetic adaptation, and Nahua use of writing.",
      },
      {
        title: "La variedad misionera del náhuatl en el Vocabulario de Molina",
        institution: "Estudios de Cultura Náhuatl, UNAM",
        url: "https://nahuatl.historicas.unam.mx/index.php/ecn/article/view/77714",
        note: "Research on variation and the learned missionary register in a foundational dictionary.",
      },
      {
        title: "Catálogo de las Lenguas Indígenas Nacionales: Náhuatl",
        institution: "INALI",
        url: "https://www.inali.gob.mx/sitios/clin-inali/html/l_nahuatl.html",
        note: "Official recognition of Nahuatl variants and their community names.",
      },
      {
        title: "Languages and Religion: Molina's 1571 Vocabulario",
        institution: "Library of Congress",
        url: "https://www.loc.gov/exhibits/exploring-the-early-americas/languages-and-religion.html",
        note: "A digitized example of early colonial Nahuatl lexicography and print culture.",
      },
    ],
  },
  {
    slug: "huasteca-nahua-life",
    number: 4,
    icon: "region",
    title: "Huasteca Nahua Communities",
    shortTitle: "Huasteca Nahua Life",
    summary:
      "Place this course in northern Veracruz and in the living, changing communities around Chicontepec rather than treating modern Nahuatl as a survival exhibit.",
    duration: "10 min",
    distinction:
      "Huasteca Nahua and Teenek or Huastec are not synonyms. The Huasteca is a multiethnic region where several Indigenous peoples and languages meet.",
    takeaways: [
      "Chicontepec is one important center of Nahuatl in northern Veracruz.",
      "The Huasteca includes Nahua, Teenek, Tepehua, Otomi, and other communities.",
      "Living culture changes; no single custom represents every family or locality.",
    ],
    sections: [
      {
        title: "Where the language in this course lives",
        paragraphs: [
          "Itzli teaches a Nahuatl variety associated with Chicontepec in the Huasteca of Veracruz. INALI lists Nahuatl of the Huasteca of Veracruz as a recognized variant, and INPI identifies Chicontepec as one of the Veracruz municipalities with a large Nahuatl-speaking population.",
          "That regional grounding matters. Pronunciation, ordinary vocabulary, verb forms, and conversational preferences can differ from those found in central Mexican colonial texts or in modern courses based on other communities.",
        ],
      },
      {
        title: "The Huasteca is a shared region, not one people",
        paragraphs: [
          "The Huasteca spans parts of several modern states and has long been home to multiple peoples. Nahua communities share the region with Teenek communities, whose language belongs to the Mayan family, as well as with Tepehua, Otomi, Totonac, and other populations in different areas.",
          "Calling this course Huasteca Nahuatl describes geography and a language variety. It does not mean that Nahua speakers are Teenek, or that all communities across the Huasteca share the same history and practices.",
        ],
      },
      {
        title: "Community life, land, and ritual",
        paragraphs: [
          "INPI describes kinship and compadrazgo as important forms of social organization in Veracruz Nahua communities, alongside agriculture and community obligations. Milpa cultivation is both material work and, in some communities, part of ceremonial relationships with land, rain, crops, and the dead.",
          "Public accounts from Chicontepec document Xantolo observances and ceremonial paper figures used in relations with forces of the earth. These practices are locally specific and internally diverse. They should be approached as living knowledge, not as unchanged remnants of an Aztec past.",
        ],
      },
      {
        title: "Continuity includes change",
        paragraphs: [
          "Schools, migration, churches, wage labor, media, state policy, environmental pressures, and digital communication all shape contemporary life. People can maintain language and community commitments while also creating new forms of expression. Cultural continuity is active work, not isolation from the present.",
          "A responsible learning app supports that work without claiming ownership of it. Speaker knowledge, local teachers, and community decisions remain authoritative. This course is a bridge for learners, not a replacement for relationships with living communities.",
        ],
      },
    ],
    sources: [
      {
        title: "Nahuas de Veracruz: Etnografía",
        institution: "INPI",
        url: "https://atlas.inpi.gob.mx/nahuas-de-veracruz-etnografia/",
        note: "Regional location, history, social organization, land, and community life.",
      },
      {
        title: "Nahuatl de la Huasteca veracruzana",
        institution: "INALI",
        url: "https://www.inali.gob.mx/sitios/clin-inali/html/v_nahuatl.html",
        note: "Official geo-statistical references and community names for the regional variant.",
      },
      {
        title: "Nahua / Nahuatl",
        institution: "INPI",
        url: "https://catalogo.inpi.gob.mx/nahua-nahuatl/",
        note: "Contemporary catalogue entry including milpa and ceremonial life in the Huasteca.",
      },
      {
        title: "Los abuelos de la tierra",
        institution: "Museo Nacional de Antropología, INAH",
        url: "https://mna.inah.gob.mx/detalle_pieza_mes.php?id=350",
        note: "A focused account of ceremonial paper figures among Nahuas of Chicontepec.",
      },
      {
        title: "Xantolo in Acatitla, Chicontepec",
        institution: "INAH",
        url: "https://inah.gob.mx/boletines/nahuas-de-chicontepec-veracruz-colocan-altar-de-muertos-y-recrean-el-xantolo-en-el-museo-nacional-de-antropologia",
        note: "A community-specific account of Xantolo practices presented at the national museum.",
      },
    ],
  },
  {
    slug: "reading-history-carefully",
    number: 5,
    icon: "sources",
    title: "Reading Nahua History Carefully",
    shortTitle: "Reading the Sources",
    summary:
      "Learn how codices, alphabetic texts, oral histories, archaeology, and colonial accounts answer different questions and carry different silences.",
    duration: "9 min",
    distinction:
      "No codex, chronicle, excavation, or modern retelling speaks for all Nahua peoples or gives an unfiltered view of the past.",
    takeaways: [
      "Every source was made at a particular time for an audience and purpose.",
      "Indigenous-authored does not mean context-free, and colonial does not mean useless.",
      "Strong historical interpretation compares different kinds of evidence.",
    ],
    sections: [
      {
        title: "Begin with the maker and the moment",
        paragraphs: [
          "Before asking whether a source is true, ask what kind of truth it was built to communicate. Who made it? In which language and medium? For whom? Under whose patronage or authority? What outcome did its makers want? How long after the events was it produced?",
          "A tribute record, migration history, land map, missionary dictionary, court petition, temple offering, and oral narrative may all preserve valuable knowledge. They do not preserve the same kind of knowledge or answer the same questions.",
        ],
        points: [
          "Identify the maker, audience, date, place, and medium.",
          "Separate the event described from the date the account was created.",
          "Notice whose interests and categories organize the record.",
        ],
      },
      {
        title: "Codices are structured arguments",
        paragraphs: [
          "Codices and pictorial maps organize space, ancestry, place names, tribute, dates, and political memory through conventions that require interpretation. They are not transparent photographs of the precontact world, and many surviving examples were created or recopied after conquest for colonial institutions.",
          "The 1593 Codex Quetzalecatzin, for example, combines pictorial conventions, Nahuatl glosses, Latin-script writing, genealogy, and land information. Its mixed form is evidence of adaptation and legal argument, not cultural confusion.",
        ],
      },
      {
        title: "Alphabetic texts preserve voices and pressures",
        paragraphs: [
          "Nahua annalists and historians such as Chimalpahin and Tezozomoc wrote from particular communities, lineages, and political circumstances. Their work preserves Indigenous intellectual traditions while also responding to colonial genres and audiences.",
          "Spanish clerical and military accounts likewise contain indispensable observations alongside theological assumptions, self-justification, translation problems, and unequal power. Reading critically means identifying those pressures, not discarding every colonial document or accepting it literally.",
        ],
      },
      {
        title: "Build history from converging evidence",
        paragraphs: [
          "Archaeology can test claims about construction, diet, trade, violence, environment, and chronology. Linguistics can trace relationships and change. Community memory can preserve place-based knowledge and meanings absent from official archives. Each line of evidence has its own methods and limits.",
          "The best account is usually the one that explains where sources agree, where they conflict, and why. That habit protects learners from both colonial stereotypes and romantic stories that flatten Indigenous people into symbols.",
        ],
      },
    ],
    sources: [
      {
        title: "The Codex Quetzalecatzin",
        institution: "Library of Congress",
        url: "https://www.loc.gov/item/2017590521/",
        note: "A free-to-use 1593 Nahuatl pictorial land and genealogy document with detailed catalog context.",
      },
      {
        title: "El náhuatl posee una larga historia como lengua escrita",
        institution: "Estudios de Cultura Náhuatl, UNAM",
        url: "https://nahuatl.historicas.unam.mx/index.php/ecn/article/view/78800/69785",
        note: "Pictorial, glyphic, and alphabetic writing as a connected historical practice.",
      },
      {
        title: "El náhuatl de la Crónica mexicana",
        institution: "Estudios de Cultura Náhuatl, UNAM",
        url: "https://nahuatl.historicas.unam.mx/index.php/ecn/article/view/77866",
        note: "Language, authorship, and historical writing in the work attributed to Tezozomoc.",
      },
      {
        title: "Tenochtitlan: apuntes sobre su historia",
        institution: "INAH / Museo del Templo Mayor",
        url: "https://inah.gob.mx/boletines/nuevo-libro-gratuito-acerca-la-historia-de-tenochtitlan-al-publico",
        note: "A modern institutional synthesis built from archaeology, codices, and historical scholarship.",
      },
    ],
  },
];

export function getCultureModule(slug: string): CultureModule | undefined {
  return CULTURE_MODULES.find((module) => module.slug === slug);
}
