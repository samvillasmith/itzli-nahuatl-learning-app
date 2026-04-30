/**
 * Variant groups per unit.
 *
 * Each group defines one canonical vocab ID (the form to teach) and one or
 * more variant IDs (alternate spellings / dialect forms / loanword synonyms
 * that are suppressed from quizzes but displayed as "also written: …" notes
 * on the learn card).
 *
 * Rules used to pick the canonical form:
 *   1. Prefer forms without ⚠️/❌ annotations (non-standard flag).
 *   2. Among un-annotated forms, prefer the IDIEZ-attested / absolutive form.
 *   3. For Spanish loanwords vs. native EHN equivalents, prefer native EHN.
 *   4. Tie-break: lowest rank (first introduced in the source curriculum).
 */

export type VariantGroup = {
  canonicalId: number;
  variantIds: number[];
};

export const VARIANT_GROUPS: Record<number, VariantGroup[]> = {
  // ── Unit 2: Questions ──────────────────────────────────────────────────────
  2: [
    // "now": axcan (std) · variants: ama (colloquial), axan, nama, axkan
    { canonicalId: 40, variantIds: [16, 36, 37, 42] },
    // "where": campa · variants: canque, canin
    { canonicalId: 19, variantIds: [27, 38] },
    // "yes": quena · variants: quema (was mis-glossed), kemah, kehme
    { canonicalId: 22, variantIds: [21, 41, 43] },
    // "how": queha · variants: quehatza, kezki
    { canonicalId: 25, variantIds: [31, 44] },
  ],

  // ── Unit 3: What is your name? ────────────────────────────────────────────
  3: [
    // "you (sg)": ta (DB row renamed from taha; emphatic form naha/taha/yaha
    // were the old canonical IDs — variant rows 45/46/47 were deleted by
    // delete-variant-duplicates.js so there's nothing left to collapse)
    // "they": yahuanti · variant: ininhuanti
    { canonicalId: 55, variantIds: [60] },
    // "name": tocaitl (absolutive) · variant: toca (bare stem)
    { canonicalId: 61, variantIds: [48] },
  ],

  // ── Unit 4: Colors and Numbers ────────────────────────────────────────────
  4: [
    // "one": ce · variants: se, ze
    { canonicalId: 62, variantIds: [82, 83] },
    // "three": eyi · variant: yeyi
    { canonicalId: 64, variantIds: [85] },
    // "four": nahui · variant: naui
    { canonicalId: 65, variantIds: [84] },
    // "big/great": hueyi · variant: ueyi
    { canonicalId: 66, variantIds: [86] },
    // "five": macuilli · variant: makuil
    { canonicalId: 71, variantIds: [89] },
    // "black": yayahuic · variant: tliltic
    { canonicalId: 76, variantIds: [91] },
    // "white": chipahuac · variant: istak
    { canonicalId: 77, variantIds: [87] },
  ],

  // ── Unit 5: The Professions ───────────────────────────────────────────────
  5: [
    // "doctor/healer": ticitl (native EHN) · variants: tepahtihquetl, médico
    { canonicalId: 118, variantIds: [92, 99] },
    // "father/priest form": tahtzi · variant: tatahtzi
    { canonicalId: 93, variantIds: [96] },
    // "soldier": yaotl (native) · variant: soldado (Spanish loanword)
    { canonicalId: 103, variantIds: [94] },
    // "priest": teopixqui · variants: totahtzi, teopixquetl, teopixcatzin, padre
    { canonicalId: 104, variantIds: [95, 110, 114, 117] },
    // "teacher": tlamachtihquetl · variant: temachtijk
    { canonicalId: 101, variantIds: [108] },
    // "handkerchief": tlaxkalpayo · variant: amatlaxkalyoyomitl
    { canonicalId: 112, variantIds: [116] },
  ],

  // ── Unit 6: Intransitive Verbs ────────────────────────────────────────────
  6: [
    // "to be": eli · variants: eltoc, itztoc, ca
    { canonicalId: 122, variantIds: [128, 131, 135] },
    // "to arrive": ahsi · variants: asi, azi, ahci, ahzi
    { canonicalId: 124, variantIds: [136, 137, 138, 142] },
    // "to sleep": cochi · variant: kochi
    { canonicalId: 127, variantIds: [145] },
  ],

  // ── Unit 7: How to divide up the day ─────────────────────────────────────
  7: [
    // "sun": tonatih · variant: tonal
    { canonicalId: 160, variantIds: [173] },
    // "morning": ihnalpa · variant: ihnaloc
    { canonicalId: 161, variantIds: [163] },
    // "night": tlayohua · variant: tlayohuilotl (nominalized form)
    { canonicalId: 166, variantIds: [170] },
  ],

  // ── Unit 8: Possessive markers ────────────────────────────────────────────
  8: [
    // "this": inin (std independent dem.) · variants: ni, imin (non-std), in
    { canonicalId: 189, variantIds: [174, 190, 200] },
    // "that": inon (std independent dem.) · variants: ne, nopa, on
    { canonicalId: 188, variantIds: [175, 179, 199] },
    // "here": nica · variant: nicani
    { canonicalId: 176, variantIds: [183] },
    // "there": neca · variant: nepa
    { canonicalId: 177, variantIds: [178] },
    // "all": nochi · variant: mochi
    { canonicalId: 181, variantIds: [201] },
    // "other": occe (std) · variants: ceyoc, ohze, ohzequi
    { canonicalId: 191, variantIds: [182, 192, 193] },
    // "alligator": cipactli · variants: zipaktli, aketspali, acuetzpalin
    // (four words for the same animal — off-theme for this unit)
    { canonicalId: 194, variantIds: [195, 197, 198] },
  ],

  // ── Unit 9: The Family ────────────────────────────────────────────────────
  9: [
    // "brother": icni · variant: ikni
    { canonicalId: 203, variantIds: [219] },
    // "sister": huelti · variant: uelti
    { canonicalId: 210, variantIds: [222] },
    // "child": conetl (absolutive) · variant: pilconetzi (diminutive)
    { canonicalId: 226, variantIds: [214] },
    // "aunt": ahuitl (absolutive) · variant: aui (bare stem)
    { canonicalId: 227, variantIds: [216] },
    // "father": tahtli (absolutive) · variant: tata (familiar short form)
    { canonicalId: 224, variantIds: [217] },
    // "mother": nantli (absolutive) · variant: nana (familiar short form)
    { canonicalId: 223, variantIds: [218] },
  ],

  // ── Unit 10: My Appearance ────────────────────────────────────────────────
  10: [
    // "good": cualli · variant: kuali
    { canonicalId: 231, variantIds: [254] },
    // "long": huehueyac · variant: hueyac
    { canonicalId: 242, variantIds: [255] },
    // "tall": huehcapantic · variant: hueyic
    { canonicalId: 249, variantIds: [257] },
    // "cold": cecic · variant: sejsek
    { canonicalId: 252, variantIds: [256] },
  ],

  // ── Unit 11: When you greet and say farewell ──────────────────────────────
  11: [
    // "hello": pialli · variant: niltze
    { canonicalId: 260, variantIds: [272] },
    // "thank you": tlazohcamati (std) · variants: tlazcamati, tlazohkamati
    { canonicalId: 266, variantIds: [263, 267] },
  ],

  // ── Unit 12: Future tense and indefinite verbs ────────────────────────────
  12: [
    // "to open the mouth / speak": camati · variant: kamati
    { canonicalId: 280, variantIds: [288] },
    // "to speak": tlahtohua · variants: camanalohua (to chat), tlahtoa
    { canonicalId: 281, variantIds: [284, 290] },
    // "to say": ilia · variant: ihtoa
    { canonicalId: 286, variantIds: [301] },
    // "to call / summon": nonoza · variant: nonotza
    { canonicalId: 287, variantIds: [289] },
    // "to write": tlahcuilohua · variant: ihcuiloa
    { canonicalId: 285, variantIds: [304] },
  ],

  // ── Unit 13: Verbs with specific object ───────────────────────────────────
  13: [
    // "to eat (s.t.)": cua · variants: tlacua (tla-prefixed), cuā (macron variant)
    { canonicalId: 321, variantIds: [309, 322] },
    // "to make tortillas": tlaxcaloa · variants: tlaxkaloa, tlaxkalchiua
    { canonicalId: 311, variantIds: [312, 318] },
    // "to give": maca · variant: maka
    { canonicalId: 314, variantIds: [315] },
    // "to make / do": chihua · variants: ayi (non-std), chīhua (macron variant)
    { canonicalId: 316, variantIds: [320, 330] },
    // "to cut": tequi · variant: cotona
    { canonicalId: 326, variantIds: [329] },
    // "to cook": huicci · variant: iucci
    { canonicalId: 331, variantIds: [328] },
  ],

  // ── Unit 14: Past Tense Verbs Part 1 ─────────────────────────────────────
  14: [
    // "to die": miqui · variant: miki
    { canonicalId: 335, variantIds: [341] },
    // "to flee": cholohua · variant: choloa
    { canonicalId: 339, variantIds: [349] },
    // "to close": tzacui · variant: tzacua
    { canonicalId: 345, variantIds: [346] },
    // "to be born": tlacati · variant: tlalticpacquiza (lit. "come out onto the earth")
    { canonicalId: 350, variantIds: [356] },
  ],

  // ── Unit 15: Past Tense Verbs Part 2 ─────────────────────────────────────
  15: [
    // "to dig": tlaxahua · variant: tataca
    { canonicalId: 359, variantIds: [368] },
    // "to sing": cuica · variant: kuika
    { canonicalId: 362, variantIds: [366] },
    // "to cry": choca · variants: chuca, choka
    { canonicalId: 363, variantIds: [364, 365] },
  ],

  // ── Unit 17: I Sit in the Chair ───────────────────────────────────────────
  17: [
    // "table": huapalli (native EHN plank/bench) · variant: mesa (Spanish)
    { canonicalId: 408, variantIds: [392] },
    // "shirt": coto · variant: koto (annotated)
    { canonicalId: 394, variantIds: [416] },
    // "fire": tletl (std) · variant: tlitl (annotated as non-std)
    { canonicalId: 417, variantIds: [396] },
  ],

  // ── Unit 18: What I Like and Do Not Like ──────────────────────────────────
  18: [
    // "sour": xococ · variant: xokok
    { canonicalId: 427, variantIds: [429] },
    // "sweet corn tamale": xamitl · variant: xamili
    { canonicalId: 430, variantIds: [434] },
    // "tasty / pleasant": huelic · variant: ajuiyak
    { canonicalId: 431, variantIds: [435] },
  ],

  // ── Unit 20: The Grammar of -pil and -tzin ────────────────────────────────
  20: [
    // "friend": huampo (native EHN) · variant: amigo (Spanish)
    { canonicalId: 445, variantIds: [442] },
    // "man / person": tlacatl · variants: oquichtli (specifically male), tacat (variant spelling)
    { canonicalId: 447, variantIds: [451, 467] },
    // "deceased person": mihquetl · variant: mihcatzi (diminutive/reverential)
    { canonicalId: 449, variantIds: [450] },
    // "mango": mango · variant: manco (spelling variant)
    { canonicalId: 463, variantIds: [464] },
    // "skin (of humans)": ehuatl (std) · variants: euatl, ewatl
    { canonicalId: 468, variantIds: [465, 466] },
  ],

  // ── Unit 21: What We Have in the Field ───────────────────────────────────
  21: [
    // "cat": mistli (absolutive) · variant: mizto (colloquial)
    { canonicalId: 485, variantIds: [471] },
    // "dried corncob / corn": olotl · variant: cintli (ear of corn)
    { canonicalId: 472, variantIds: [482] },
    // "turkey": totoli · variant: palach
    { canonicalId: 483, variantIds: [484] },
    // "river": hueyatl (lit. "big water", std) · variant: atemitl (annotated)
    { canonicalId: 491, variantIds: [489] },
    // "grasshopper": chapolin (absolutive) · variant: chapoli (bare stem)
    { canonicalId: 496, variantIds: [492] },
  ],

  // ── Unit 22: Our Cornfield and Our Food ──────────────────────────────────
  22: [
    // "bean seed": exinachtli (std) · variant: eyoli (annotated)
    { canonicalId: 515, variantIds: [499] },
    // "food": tlacualli (noun) · variant: tlacualiztli (nominalized action)
    { canonicalId: 513, variantIds: [516] },
  ],

  // ── Unit 23: What is Inside the House ────────────────────────────────────
  23: [
    // "house": calli · variants: kal, kali, kalli, cal·li
    { canonicalId: 518, variantIds: [527, 528, 530, 534] },
    // "book": amoxtli (absolutive, std) · variants: libro (Spanish), amox (bare stem), amochtli
    { canonicalId: 538, variantIds: [520, 529, 543] },
    // "medicine": pahtli · variant: pajtli
    { canonicalId: 521, variantIds: [535] },
    // "bag": folsah · variant: folzah
    { canonicalId: 523, variantIds: [524] },
  ],

  // ── Unit 24: I Had Gone to the City Part 1 ───────────────────────────────
  24: [
    // "church": teopan (std) · variant: tiopa (contracted)
    { canonicalId: 562, variantIds: [545] },
    // "state / territory": tlatilantli · variant: estado (Spanish)
    { canonicalId: 552, variantIds: [546] },
    // "road / way": ojtli · variant: ojtl (dropped final vowel)
    { canonicalId: 560, variantIds: [557] },
  ],

  // ── Unit 25: I Had Gone to the City Part 2 ───────────────────────────────
  25: [
    // "then / already": yeca · variant: huahca
    { canonicalId: 566, variantIds: [569] },
    // "underwear": calzomitl · variant: kaltsomitl
    { canonicalId: 574, variantIds: [576] },
    // "eleven": mahtlactli huan ce (std) · variants: majtlaktl uan se, matlaktli uan se
    { canonicalId: 580, variantIds: [578, 579] },
    // "flatulence": ihyelli · variant: iyelli
    { canonicalId: 588, variantIds: [584] },
  ],

  // ── Unit 26: I Came to Buy a Tortilla Napkin ─────────────────────────────
  26: [
    // "money": tomin (absolutive) · variant: tomi (bare stem)
    { canonicalId: 591, variantIds: [589] },
    // "orange / citrus fruit": alaxox · variants: chilcoz, xokotl
    { canonicalId: 593, variantIds: [595, 600] },
    // "bread": pantzi · variant: pantsij
    { canonicalId: 594, variantIds: [608] },
    // "tamale": tamali (absolutive) · variant: tamal (Spanish-influenced)
    { canonicalId: 604, variantIds: [598] },
    // "traditional garment / underwear": maxtli · variants: kalson, calzon (Spanish loanwords)
    { canonicalId: 599, variantIds: [601, 603] },
    // "comal (griddle)": comalli · variant: komali
    { canonicalId: 605, variantIds: [602] },
  ],

  // ── Unit 27: It's market day today! ──────────────────────────────────────
  27: [
    // "pineapple": matzahtli · variant: matzohtli
    { canonicalId: 615, variantIds: [618] },
  ],

  // ── Unit 28: I Was Passing By Your House ─────────────────────────────────
  28: [
    // "doorway / threshold": caltentli · variant: calaquiyan (entrance place)
    { canonicalId: 629, variantIds: [631] },
  ],

  // ── Unit 29: What Illnesses Do You Know? ─────────────────────────────────
  29: [
    // "someone": aca · variants: aka, acah
    { canonicalId: 648, variantIds: [649, 650] },
    // "head": cuaitl · variant: kwaitl
    { canonicalId: 652, variantIds: [654] },
  ],

  // ── Unit 30: The conditional, Part 1 ─────────────────────────────────────
  30: [
    // "never": aic · variants: ax quema (annotated), aik
    { canonicalId: 666, variantIds: [664, 667] },
    // "buttock": tsimpa · variant: tzintamalli
    { canonicalId: 669, variantIds: [671] },
    // "nothing": ahtle · variant: ahmotlein
    { canonicalId: 677, variantIds: [670] },
    // "butter": chichiualayotl · variant: chichihualayotl (spelling variant)
    { canonicalId: 673, variantIds: [674] },
  ],

  // ── Unit 31: Cleansing ceremonies / conditional Part 2 ───────────────────
  31: [
    // "wind / air": ahacatl · variants: ahakatl, yecatl
    { canonicalId: 681, variantIds: [683, 692] },
    // "sea / ocean": weyiatl · variant: hueyi atl (written as two words)
    { canonicalId: 684, variantIds: [687] },
  ],

  // ── Unit 32: Tē- and tla- object markers ─────────────────────────────────
  32: [
    // "with / by means of": ica · variant: ika
    { canonicalId: 693, variantIds: [703] },
    // "very / really": tlahuel · variant: eltoya
    { canonicalId: 699, variantIds: [697] },
  ],

  // ── Unit 33: The Months of the Year ──────────────────────────────────────────
  33: [
    { canonicalId: 6221, variantIds: [7125] },  // "morning": ihnaloc / kualkan
    { canonicalId: 6330, variantIds: [6742] },  // "night": tlayohuilotl / youali
  ],

  // ── Unit 35: Colors, Sizes and Shapes ──────────────────────────────────────
  35: [
    { canonicalId: 6737, variantIds: [7295] },          // "black": yayauik / tliltic
    { canonicalId: 6383, variantIds: [7140, 7326] },    // "blue": asultik / matlaltic / yahuitl
    { canonicalId: 6194, variantIds: [6988] },           // "orange": chilcoz / chichilkostik
    { canonicalId: 6505, variantIds: [7041, 7067] },    // "tall": lalakatik / cuauhtic / hueyic
    { canonicalId: 6424, variantIds: [6447] },           // "white": chipauak / istak
    { canonicalId: 7034, variantIds: [7479] },           // "yellow": coztic / cozauhqui
  ],

  // ── Unit 36: Describing Things ─────────────────────────────────────────────
  36: [
    { canonicalId: 6379, variantIds: [6239] },           // "book": amochtli (native) / libro (Spanish)
    { canonicalId: 6589, variantIds: [7288, 7290] },     // "quesadilla": pompoj / tlaxcalpacholli / variant
  ],

  // ── Unit 37: Animals ───────────────────────────────────────────────────────
  37: [
    { canonicalId: 6342, variantIds: [6394] },   // "ant": tzicatl / axkaneli
    { canonicalId: 6076, variantIds: [6542] },   // "cat": cihuamizto / misto
    { canonicalId: 6072, variantIds: [6743] },   // "dragonfly": apipiyalotl / aabiontzin
    { canonicalId: 6476, variantIds: [6616] },   // "owl": koamojmoktli / tekolotl
    { canonicalId: 6174, variantIds: [6443] },   // "sheep": axcahua / ichkatlapiyali
    { canonicalId: 6175, variantIds: [6496] },   // "turtle": ayotl / koxualij
  ],

  // ── Unit 38: More Food and Ingredients ─────────────────────────────────────
  38: [
    { canonicalId: 6238, variantIds: [6983] },   // "milk": lechi / chichihualatl
    { canonicalId: 6304, variantIds: [6497] },   // "to eat": tlacua / kua
  ],

  // ── Unit 39: Around the House ──────────────────────────────────────────────
  39: [
    { canonicalId: 6300, variantIds: [6621] },           // "church": tiopa / teokali
    { canonicalId: 6249, variantIds: [6346] },           // "garden": miltitla / xochimilli
    { canonicalId: 6703, variantIds: [6800] },           // "soap": xapo / ahmolli
    { canonicalId: 6247, variantIds: [6797] },           // "table": mesa / ahcopechtli
    { canonicalId: 6301, variantIds: [7235] },           // "temple": tiopamitl / teohcalli
  ],

  // ── Unit 40: Nature and the World ──────────────────────────────────────────
  40: [
    { canonicalId: 6122, variantIds: [6880] },   // "lake": ateskatl / atecochtzacualli
    { canonicalId: 6173, variantIds: [6924] },   // "river": atemitl / azezenca
    { canonicalId: 6594, variantIds: [6968] },   // "snow": sepayauitl / cececatl
  ],

  // ── Unit 41: People and Roles ──────────────────────────────────────────────
  41: [
    { canonicalId: 6284, variantIds: [6252] },   // "doctor": tepahtihquetl (native) / médico (Spanish)
    { canonicalId: 6170, variantIds: [7339] },   // "friend": amigo / yoloihni
    { canonicalId: 6320, variantIds: [6857] },   // "hunter": tlapehquetl / amini
  ],

  // ── Unit 42: More Action Words ─────────────────────────────────────────────
  42: [
    { canonicalId: 6181, variantIds: [6463, 7258] },  // "to speak": camanalohua / kamati / tlahtoa
    { canonicalId: 6210, variantIds: [6227, 7390] },   // "to be": eltoc / itztoc / cah
  ],

  // ── Unit 43: Adverbs and Modifiers ─────────────────────────────────────────
  43: [
    { canonicalId: 6182, variantIds: [6958] },  // "where": canque / canin
    { canonicalId: 6255, variantIds: [7593] },  // "there": nepa / oncan
    { canonicalId: 6187, variantIds: [7185] },  // "other": ceyoc / ohze
  ],
};

/** All variant IDs across every unit — used to clean the distractor pool. */
export const ALL_VARIANT_IDS: Set<number> = new Set(
  Object.values(VARIANT_GROUPS).flatMap((groups) =>
    groups.flatMap((g) => g.variantIds)
  )
);

/**
 * Collapse variants for a single unit's vocab list.
 *
 * Returns:
 *   - `cards`: the original vocab list with variant rows removed (canonical forms only)
 *   - `notes`: { [canonicalId]: ["also written: X", "also written: Y"] } for rendering
 *
 * Used by both LessonFlow (learn cards) and FlashcardDeck (practice page) so they
 * show the same canonical set.
 */
export function collapseVariants<T extends { id: number; headword: string }>(
  vocab: T[],
  unitNum: number
): { cards: T[]; notes: Record<number, string[]> } {
  const groups = VARIANT_GROUPS[unitNum] ?? [];
  const excludeIds = new Set(
    groups
      .filter((g) => vocab.some((v) => v.id === g.canonicalId))
      .flatMap((g) => g.variantIds)
  );

  const notes: Record<number, string[]> = {};
  for (const g of groups) {
    if (!vocab.some((v) => v.id === g.canonicalId)) continue;
    const forms = vocab
      .filter((v) => g.variantIds.includes(v.id))
      .map((v) => v.headword);
    if (forms.length > 0) notes[g.canonicalId] = forms;
  }

  return {
    cards: vocab.filter((v) => !excludeIds.has(v.id)),
    notes,
  };
}
