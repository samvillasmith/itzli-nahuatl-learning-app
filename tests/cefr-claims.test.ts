import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("public CEFR claims", () => {
  const publicCopy = [
    "src/app/layout.tsx",
    "src/app/page.tsx",
    "src/app/HomeUnitsGrid.tsx",
    "src/app/units/page.tsx",
    "src/app/curriculum/page.tsx",
    "src/app/grammar/page.tsx",
    "src/app/progress/ProgressDashboard.tsx",
    "src/app/units/UnitsListWithProgress.tsx",
    "src/app/units/[unitId]/LessonFlow.tsx",
    "src/lib/curriculum.ts",
    "README.md",
  ].map(read).join("\n");

  it("describes the final modules as B1-oriented rather than a guaranteed B1 outcome", () => {
    expect(publicCopy).toMatch(/B1-oriented/);
    expect(publicCopy).not.toMatch(/A1[–-]B1 curriculum|A1\s*(?:to|→)\s*B1|B1 · Intermediate|Intermediate — B1/);
  });

  it("publishes the current reviewed vocabulary count", () => {
    const readme = read("README.md");
    expect(readme).toContain("463 unique reviewed words and forms");
    expect(readme).toContain("476 learner-visible card placements");
    expect(readme).toContain("75 curated word-first cards");
    expect(readme).toContain("80 learner-visible source-course additions");
    expect(readme).toContain("240 reviewed source-course candidates");
    expect(readme).not.toContain("825 core lesson cards");
    expect(readme).not.toContain("37,000-entry EHN lexicon");
  });
});

describe("responsive navigation", () => {
  it("keeps the mobile learning dock off desktop screens", () => {
    const styles = read("src/app/globals.css");
    expect(styles).toMatch(
      /@media\s*\(min-width:\s*48rem\)[\s\S]*?\.mobile-learning-nav\s*\{\s*display:\s*none;/,
    );
  });
});
