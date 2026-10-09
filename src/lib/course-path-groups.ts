/** Contiguous groups preserve the published sequence, even when a topic returns later. */
export function groupCoursePath<T extends { stageTitleEn: string }>(lessons: readonly T[]) {
  const groups: { title: string; units: T[] }[] = [];
  for (const lesson of lessons) {
    const previous = groups.at(-1);
    if (previous?.title === lesson.stageTitleEn) previous.units.push(lesson);
    else groups.push({ title: lesson.stageTitleEn, units: [lesson] });
  }
  return groups;
}
