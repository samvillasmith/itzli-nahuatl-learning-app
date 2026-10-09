import "server-only";
import courseData from "@/data/nahuatlahtolli-course.json";
import { isAppContentExcluded } from "@/lib/app-content-safety";
import learnerExclusions from "@/data/app-content-exclusions.json";
import excludedAudio from "@/data/audio-learner-exclusions.json";

export type SourceMediaLink = {
  type: "audio" | "image" | "video" | "file";
  url: string;
};

export type SourceSection = {
  heading: string;
  body: string[];
  sourceSectionIndex?: number;
  sourceBodyIndices?: number[];
};

export type SourceVocabularyItem = {
  headword: string;
  gloss: string;
  audioUrl: string | null;
  sourceVocabularyIndex?: number;
};

export type SourceLesson = {
  number: number;
  wordpressId: number;
  title: string;
  nahuatlTitle: string;
  englishTitle: string;
  slug: string;
  originalUrl: string;
  modified: string | null;
  sections: SourceSection[];
  vocabulary: SourceVocabularyItem[];
  mediaLinks: SourceMediaLink[];
};

export type SourceSupportPage = {
  kind: string;
  title: string;
  slug: string;
  originalUrl: string;
  modified: string | null;
  sections: SourceSection[];
  mediaLinks: SourceMediaLink[];
};

export type NahuatlahtolliCourse = {
  source: {
    name: string;
    subtitle: string;
    originalUrl: string;
    oerListingUrl: string;
    publisher: string;
    authors: string[];
    license: {
      name: string;
      shortName: string;
      url: string;
    };
    importMethod: string;
    robotsTxt: string;
    importedAt: string;
    notes: string[];
  };
  supportPages: SourceSupportPage[];
  lessons: SourceLesson[];
};

const excludedSourceBody = new Set(learnerExclusions.learnerSourceBodyExclusions.map(
  row => `${row.lessonNumber}:${row.sectionIndex}:${row.bodyIndex}`,
));
const excludedSourceAudio = new Set<string>(excludedAudio.excluded_source_urls);

function sanitizeSections(sections: SourceSection[], lessonNumber?: number): SourceSection[] {
  return sections
    .map((section, sectionIndex) => ({
      ...section,
      sourceSectionIndex: section.sourceSectionIndex ?? sectionIndex,
      sourceBodyIndices: section.body.flatMap((line, index) => isAppContentExcluded(line) ||
        excludedSourceBody.has(`${lessonNumber}:${section.sourceSectionIndex ?? sectionIndex}:${section.sourceBodyIndices?.[index] ?? index}`)
        ? [] : [section.sourceBodyIndices?.[index] ?? index]),
      body: section.body.filter((line, index) => !isAppContentExcluded(line) &&
        !excludedSourceBody.has(`${lessonNumber}:${section.sourceSectionIndex ?? sectionIndex}:${section.sourceBodyIndices?.[index] ?? index}`)),
    }))
    .filter((section) => section.body.length > 0 && !isAppContentExcluded(section.heading));
}

export function sanitizeSourceLesson(lesson: SourceLesson): SourceLesson {
  return {
    ...lesson,
    sections: sanitizeSections(lesson.sections, lesson.number),
    vocabulary: lesson.vocabulary.map((item, index) => ({ ...item, sourceVocabularyIndex: item.sourceVocabularyIndex ?? index + 1 })).filter(
      (item) => !isAppContentExcluded(item.headword, item.gloss, item.audioUrl)
    ),
    mediaLinks: lesson.mediaLinks.filter((link) => !isAppContentExcluded(link.url) && !excludedSourceAudio.has(link.url)),
  };
}

function sanitizeSupportPage(page: SourceSupportPage): SourceSupportPage {
  return {
    ...page,
    sections: sanitizeSections(page.sections),
    mediaLinks: page.mediaLinks.filter((link) => !isAppContentExcluded(link.url) && !excludedSourceAudio.has(link.url)),
  };
}

function sanitizeCourse(course: NahuatlahtolliCourse): NahuatlahtolliCourse {
  return {
    ...course,
    supportPages: course.supportPages.map(sanitizeSupportPage),
    lessons: course.lessons.map(sanitizeSourceLesson),
  };
}

export const NAHUATLAHTOLLI_COURSE = sanitizeCourse(courseData as NahuatlahtolliCourse);

const LESSON_BY_NUMBER = new Map(
  NAHUATLAHTOLLI_COURSE.lessons.map((lesson) => [lesson.number, lesson])
);

export function getNahuatlahtolliLesson(lessonNumber: number): SourceLesson | null {
  return LESSON_BY_NUMBER.get(lessonNumber) ?? null;
}

export function getNahuatlahtolliStats() {
  return {
    lessons: NAHUATLAHTOLLI_COURSE.lessons.length,
    supportPages: NAHUATLAHTOLLI_COURSE.supportPages.length,
    vocabulary: NAHUATLAHTOLLI_COURSE.lessons.reduce(
      (sum, lesson) => sum + lesson.vocabulary.length,
      0
    ),
    mediaLinks: NAHUATLAHTOLLI_COURSE.lessons.reduce(
      (sum, lesson) => sum + lesson.mediaLinks.length,
      0
    ),
    sections: NAHUATLAHTOLLI_COURSE.lessons.reduce(
      (sum, lesson) => sum + lesson.sections.length,
      0
    ),
  };
}
