"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildAllCourseAudioInventory, EXPECTED_RECIPE } = require("./lib/all-course-audio-inventory.cjs");

if (require.main === module) {
  const coreOnly = process.argv.includes("--core-only");
  const plan = buildAllCourseAudioInventory({ coreOnly });
  if (process.argv.includes("--write")) {
    const directory = path.resolve(__dirname, "../data/audio-v3");
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, coreOnly ? "all-course-air-b-core-plan.private.json" : "all-course-air-b-plan.private.json"),
      JSON.stringify(plan, null, 2) + "\n");
  }
  console.log(JSON.stringify({ recipe_id: EXPECTED_RECIPE, scope: plan.scope, summary: plan.summary,
    recipe_holds: plan.records.filter(row => row.status === "recipe-or-structure-hold").map(row => ({ id: row.id, text: row.runtime_text, reasons: row.hold_reasons })) }, null, 2));
}
