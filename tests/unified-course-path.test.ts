import { describe, expect, it } from "vitest";
import { CURRICULUM_PATH } from "../src/lib/curriculum";
import { getAdjacentUnifiedPathLessons, getUnifiedCoursePath, getUnifiedLessonForEntry, getUnifiedPathLesson } from "../src/lib/unified-course-path";
import { getNextUnifiedPathLesson, getUnifiedPathProgress } from "../src/lib/unified-path-progress";
import { emptyProgress, parseProgressData } from "../src/lib/progress-schema";
import { parseExpansionCourseProgress } from "../src/lib/expansion-course";
import { getVerifiedExpansionEntries } from "../src/data/v3-expansion";
import course from "../src/data/v3-original-course.json";
import assignments from "../src/data/course-path-extension.json";
import progression from "../src/data/course-path-progression.json";
import { groupCoursePath } from "../src/lib/course-path-groups";
import instructional from "../src/data/instructional-lesson-blueprints.json";
import { countVocabularyWrittenForms, getUnifiedVocabulary, searchUnifiedVocabulary } from "../src/lib/unified-vocabulary";

describe("one course path preserves existing work and teaches all approved additions", () => {
  it("keeps all 43 original lesson identities in their established order and gives every lesson a unique numeric route", () => {
    const path = getUnifiedCoursePath();
    expect(path.filter(lesson=>lesson.kind==='legacy').map(lesson=>lesson.lessonNumber)).toEqual(CURRICULUM_PATH.map(lesson=>lesson.lesson));
    expect(path.filter(lesson=>lesson.kind==='legacy').map(lesson=>lesson.progressId)).toEqual(CURRICULUM_PATH.map(lesson=>String(lesson.lesson)));
    expect(new Set(path.map(lesson=>lesson.lessonNumber)).size).toBe(path.length);
    expect(path.map(lesson=>lesson.pathOrder)).toEqual(Array.from({length:path.length},(_,i)=>i+1));
    expect(path.length).toBe(43+course.units.length+assignments.lessons.length+instructional.supplementUnits.length);
  });
  it("places all 46 reviewed expression lessons on the same path without changing their progress IDs or tasks", () => {
    for(const [index, unit] of course.units.entries()) {
      const lesson=getUnifiedPathLesson(44+index)!;
      expect(lesson.kind).toBe("grammar"); expect(lesson.progressId).toBe(unit.id);
      expect(lesson.sourceUnit).toEqual(unit);
    }
    const path=getUnifiedCoursePath();
    for(const [index,lesson] of path.entries()) {
      expect(getAdjacentUnifiedPathLessons(lesson.lessonNumber).next?.lessonNumber).toBe(path[index+1]?.lessonNumber);
      expect(getAdjacentUnifiedPathLessons(lesson.lessonNumber).previous?.lessonNumber).toBe(path[index-1]?.lessonNumber);
    }
    expect(getUnifiedPathLesson(9999)).toBeNull();
  });
  it("assigns every new verified word once to a short guided lesson with unchanged meaning, region, source and audio", () => {
    const assigned=assignments.lessons.flatMap(lesson=>lesson.entryIds);
    expect(new Set(assigned).size).toBe(assigned.length);
    for(const entry of getVerifiedExpansionEntries(true)) {
      expect(assigned.filter(id=>id===entry.id)).toHaveLength(1);
      const lesson=getUnifiedPathLesson(getUnifiedLessonForEntry(entry.id)!)!;
      expect(lesson.entries!.length).toBeLessThanOrEqual(8);
      expect(lesson.entries!.find(item=>item.id===entry.id)).toMatchObject({
        display:entry.display,meaningEn:entry.meaningEn,meaningEs:entry.meaningEs,
        sourceUrl:entry.sourceUrl,sourceSpelling:entry.sourceSpelling,audioUrl:entry.audioUrl,
        variety:entry.verification.variety,formKind:entry.formKind,
      });
    }
    expect(assignments.counts.verifiedNewEntries).toBe(1236);
    expect(assignments.counts.earlierPackEntries).toBe(73);
  });
  it("reads retained numeric and string lesson completion together without migrating or overwriting either", () => {
    const legacy=emptyProgress(), path=getUnifiedCoursePath();
    const original=path[0];
    legacy.units[String(original.lessonNumber)]={status:"completed",completedChunks:1,totalChunks:1,lastCorrect:1,lastTotal:1,completedAt:1,curriculumRevision:"historical"};
    const added={schemaVersion:1 as const,units:{[course.units[0].id]:{completedAt:2,firstAttemptCorrect:1,total:course.units[0].steps.length}}};
    const before=JSON.stringify([legacy,added]);
    expect(getUnifiedPathProgress(original,legacy,added).status).toBe("completed");
    expect(getUnifiedPathProgress(path.find(lesson=>lesson.progressId===course.units[0].id)!,legacy,added).status).toBe("completed");
    expect(getNextUnifiedPathLesson(path,legacy,added)?.lessonNumber).toBe(path[1].lessonNumber);
    expect(JSON.stringify([legacy,added])).toBe(before);
  });
  it("intersperses grammar in topic stages, introduces prerequisites first, and keeps every displayed grouping in path order",()=>{
    const path=getUnifiedCoursePath(), positions=new Map(path.map((lesson,index)=>[lesson.lessonNumber,index]));
    for(const placement of progression.lessons) {
      for(const prerequisite of placement.prerequisites) expect(positions.get(prerequisite)).toBeLessThan(positions.get(placement.lessonNumber)!);
    }
    expect(path.findIndex(lesson=>lesson.kind==='grammar')).toBeLessThan(10);
    expect(path.filter(lesson=>lesson.kind==='grammar').every(lesson=>
      lesson.pathOrder>positions.get(progression.lessons.find(item=>item.lessonNumber===lesson.lessonNumber)!.anchorLesson)!)).toBe(true);
    expect(groupCoursePath(path).flatMap(stage=>stage.units.map(lesson=>lesson.lessonNumber))).toEqual(path.map(lesson=>lesson.lessonNumber));
    const recurring=[{stageTitleEn:'People',id:1},{stageTitleEn:'Food',id:2},{stageTitleEn:'People',id:3}];
    expect(groupCoursePath(recurring).flatMap(group=>group.units.map(x=>x.id))).toEqual([1,2,3]);
    const active=emptyProgress();
    active.units['14']={status:'in_progress',completedChunks:1,totalChunks:2,lastCorrect:1,lastTotal:1,completedAt:null,curriculumRevision:'historical'};
    expect(getNextUnifiedPathLesson(path,active)?.lessonNumber).toBe(14);
  });
  it("supports more than 100 added lesson completions without putting them into the bounded legacy document", () => {
    const legacy=emptyProgress();
    const units=Object.fromEntries(getUnifiedCoursePath().filter(lesson=>lesson.kind!=="legacy").map(lesson=>[lesson.progressId,{completedAt:5,firstAttemptCorrect:1,total:2}]));
    const added=parseExpansionCourseProgress(JSON.stringify({schemaVersion:1,units}));
    expect(added).not.toBeNull(); expect(Object.keys(added!.units).length).toBeGreaterThan(100);
    expect(parseProgressData(legacy)).toEqual(legacy);
    expect(getUnifiedPathProgress(getUnifiedCoursePath().at(-1)!,legacy,added).status).toBe("completed");
  });
  it("finds reference spellings in the supporting vocabulary index and links the canonical word to its course lesson", () => {
    const words=getUnifiedVocabulary([]);
    const results=searchUnifiedVocabulary(words,"kewkinin");
    expect(results.map(word=>word.display)).toEqual(["iwkinin"]);
    expect(results[0].lessonNumber).toBe(getUnifiedLessonForEntry(results[0].id));
    expect(searchUnifiedVocabulary(words,"wankinon")[0].supplementalSources?.some(source=>source.url.includes("revistas.inah.gob.mx"))).toBe(true);
  });
  it("preserves distinct meanings with the same spelling without inflating written-form counts", () => {
    const words = getUnifiedVocabulary([]);
    const twice = words.find(word => word.display === "ompa" && word.meaningEn === "twice");
    expect(twice).toBeDefined();
    const primer = [{ id: 900001, headword: "ompa", gloss_en: "over there", part_of_speech: "adverb", first_lesson_number: 1,
      rank: 1, semantic_domain: "location" }];
    const expanded = getUnifiedVocabulary(primer);
    expect(searchUnifiedVocabulary(expanded, "ompa").some(word => word.meaningEn === "twice")).toBe(true);
    expect(searchUnifiedVocabulary(expanded, "ompa").some(word => word.meaningEn === "over there")).toBe(true);
    expect(countVocabularyWrittenForms(expanded)).toBe(countVocabularyWrittenForms(words));
    expect(new Set(expanded.map(word => word.id)).size).toBe(expanded.length);
  });
});
