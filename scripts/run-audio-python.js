#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const venvPython =
  process.platform === "win32"
    ? path.join(root, ".venv", "Scripts", "python.exe")
    : path.join(root, ".venv", "bin", "python");

const candidates = [
  venvPython,
  process.platform === "win32" ? "python" : "python3",
  "python",
];

const python = candidates.find((candidate) =>
  path.isAbsolute(candidate) ? fs.existsSync(candidate) : true
);

const result = spawnSync(
  python,
  [path.join(__dirname, "generate-audio.py"), ...process.argv.slice(2)],
  { cwd: root, stdio: "inherit" }
);

if (result.error) {
  console.error(`Failed to start Python audio generator: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
