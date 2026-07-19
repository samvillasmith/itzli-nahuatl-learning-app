export const MAX_LEARNER_CARDS_PER_UNIT = 15;

// Correct cards whose original database lesson does not match the current
// curriculum topic. Source records remain unchanged; only course placement moves.
const CORE_UNIT_OVERRIDES = new Map<number, number>([
  [34, 11],
  [35, 11],
  [62, 34],
  [63, 34],
  [64, 34],
  [65, 34],
  [68, 34],
  [69, 34],
  [71, 34],
  [72, 34],
  [73, 34],
  [74, 34],
  [78, 34],
  [79, 34],
  [100, 34],
  [476, 37],
  [477, 37],
  [479, 37],
  [480, 37],
  [493, 37],
  [580, 34],
]);

// Oversized source lessons often mix a grammar paradigm with unrelated nouns.
// These sets define the coherent, learner-facing inventory for each affected
// curriculum unit. Unselected records remain preserved in the underlying data
// and source-course browser.
const UNIT_CARD_ALLOWLISTS = new Map<number, ReadonlySet<number>>([
  [1, new Set([1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14])],
  [2, new Set([15, 17, 18, 19, 20, 22, 23, 24, 25, 26, 28, 29, 30, 32, 33])],
  [4, new Set([66, 67, 75, 76, 77, 80, 81, 804003, 804004, 804005, 804009, 804010])],
  [5, new Set([93, 97, 98, 101, 102, 805001, 805003, 805006, 805007, 805008, 805010, 805012])],
  [6, new Set([122, 123, 124, 125, 126, 127, 132, 133, 134, 144, 806009, 806015, 806021, 806026, 806040])],
  [7, new Set([153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 165, 166, 807002, 807025, 807027])],
  [8, new Set([180, 185, 186, 7706, 7707, 7708, 808016, 808017, 808018, 808019, 808020, 808021, 808023, 808024, 808027])],
  [9, new Set([203, 204, 206, 207, 208, 209, 210, 211, 212, 213, 215, 226, 228, 809017, 809021])],
  [10, new Set([231, 232, 233, 235, 237, 238, 239, 240, 241, 242, 243, 245, 248, 249, 250])],
  [12, new Set([279, 280, 281, 282, 283, 285, 298, 812004, 812005, 812006, 812007, 812010, 812011, 812012, 812013])],
  [15, new Set([357, 359, 360, 361, 363, 367, 372, 373, 377, 7715, 7716, 815002, 815006, 815007, 815009])],
  [17, new Set([393, 394, 395, 400, 401, 402, 404, 405, 406, 408, 410, 411, 413])],
  [18, new Set([424, 425, 426, 7709, 7710, 7711, 7712])],
  [19, new Set([438, 7700, 7701, 7702, 7703, 7704, 7705, 819007, 819008, 819014])],
  [20, new Set([445, 446, 447, 453, 454, 820001, 820007, 820009, 820012, 820015, 820037])],
  [21, new Set([470, 472, 473, 475, 481, 488, 490, 494, 821001, 821003, 821005, 821007, 821013, 821017, 821019])],
  [22, new Set([497, 498, 500, 501, 502, 503, 504, 505, 507, 508, 509, 510, 512, 513, 514])],
  [27, new Set([609, 610, 611, 612, 613, 614, 615, 616, 617, 619, 620, 621, 623, 7732, 7733])],
  [34, new Set([62, 63, 64, 65, 68, 69, 71, 72, 73, 78, 79, 100, 580, 7418, 804011])],
  [37, new Set([476, 477, 479, 480, 493, 903701, 903702, 903703, 903704, 903705, 903706, 903707, 903708, 903709, 903710])],
]);

export function getCoreVocabUnit(id: number, originalUnit: number): number {
  return CORE_UNIT_OVERRIDES.get(id) ?? originalUnit;
}

export function isLearnerCardSelected(unit: number, id: number): boolean {
  const allowlist = UNIT_CARD_ALLOWLISTS.get(unit);
  return allowlist ? allowlist.has(id) : true;
}

export function selectLearnerUnitCards<T extends { id: number }>(
  cards: readonly T[],
  unit: number,
): T[] {
  return cards.filter((card) => isLearnerCardSelected(unit, card.id));
}
