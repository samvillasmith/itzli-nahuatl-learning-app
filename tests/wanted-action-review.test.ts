import { describe, expect, it } from "vitest";
import { DIALOGUE_LINE_CORRECTIONS } from "../src/data/dialogue-overrides";
import { getUnitDialogueContent } from "../src/lib/db";
import { toInaliOrthography } from "../src/lib/orthography";

describe("reviewed fixed wanted-action frames",()=>{
  it("retains learner dialogue identities and withholds recordings made for replaced text",()=>{
    const cases: [number,string,string][]=[
      [2,'223','nikneki nikkwas'],[12,'251','tikneki timomachtis'],[12,'252','nikneki nimomachtis'],
      [13,'256','nikneki nikkwas'],[18,'273','tikneki tikkwas'],[18,'274','nikneki nikkwas'],
      [29,'316','nikneki pahtli'],[32,'327','tikneki titemachtis'],[32,'328','nikneki nitemachtis'],[39,'355','nikneki nikpowas'],
    ];
    for(const [unit,id,frame] of cases) {
      const stableId=`FCN-LDG-000${id}`, correction=DIALOGUE_LINE_CORRECTIONS[stableId];
      expect(toInaliOrthography(correction.utterance_normalized).toLowerCase(),stableId).toContain(frame);
      expect(correction.audio_available).toBe(false);
      const served=getUnitDialogueContent(unit).find(line=>line.lesson_dialogue_id===stableId);
      expect(served,stableId).toBeDefined();
      expect(served!.utterance_normalized).toBe(correction.utterance_normalized);
      expect(served!.translation_en).toBe(correction.translation_en);
      expect(served!.audio_available).toBe(false);
    }
    expect(DIALOGUE_LINE_CORRECTIONS['FCN-LDG-000316'].translation_en).toBe('Yes. I want medicine today.');
  });
});
