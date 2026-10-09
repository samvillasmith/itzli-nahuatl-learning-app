"use strict";

// Compatibility entry point: releases no longer fetch the private research DB.
const { buildRelease } = require("./prepare-course-release.cjs");
try {
  const release = buildRelease();
  console.log(`Offline course database ready: ${release.bytes} bytes. No remote download.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
