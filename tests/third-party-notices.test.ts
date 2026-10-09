import fs from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
type Notice = { file: string; sha256: string; sourceUrl?: string; text?: string };
type Package = { name: string; version: string; location: string; notices: Notice[] };
const notices = require("../scripts/prepare-third-party-notices.cjs") as {
  createThirdPartyNotices: () => { text: string; manifest: { packages: Package[]; bundledNotices: Array<{ notice: Notice }> } };
  prepareThirdPartyNotices: (options: { check: boolean }) => { text: string; manifest: { packages: Package[] } };
};

describe("public third-party software distribution notices", () => {
  it("preserves exact installed React and Next copyright and permission texts", () => {
    const { text, manifest } = notices.prepareThirdPartyNotices({ check: true });
    for (const file of ["node_modules/react/LICENSE", "node_modules/react-dom/LICENSE", "node_modules/next/license.md"]) {
      expect(text).toContain(fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n").trimEnd());
    }
    expect(manifest.packages.find(pkg => pkg.name === "next")!.version)
      .toBe(require("../node_modules/next/package.json").version);
    expect(text).toContain("Itzli's project or course-content licenses do not replace or restrict these upstream grants.");
  });

  it("covers every installed non-dev locked package and each supplied compiled notice", () => {
    const { text, manifest } = notices.createThirdPartyNotices();
    const lock = require("../package-lock.json") as { packages: Record<string, { dev?: boolean }> };
    const installedProduction = Object.entries(lock.packages)
      .filter(([location, record]) => location && !record.dev && fs.existsSync(`${location}/package.json`))
      .map(([location]) => location).sort();
    expect(manifest.packages.map(pkg => pkg.location).sort()).toEqual(installedProduction);
    for (const pkg of manifest.packages) expect(pkg.notices.length).toBeGreaterThan(0);
    expect(manifest.bundledNotices.length).toBeGreaterThan(100);
    for (const { notice } of manifest.bundledNotices) {
      expect(text).toContain(fs.readFileSync(notice.file, "utf8").replace(/\r\n?/g, "\n").trimEnd());
    }
  });

  it("extracts package license sections without importing unrelated README content", () => {
    const { text, manifest } = notices.createThirdPartyNotices();
    const pgTypes = manifest.packages.find(pkg => pkg.name === "pg-types")!;
    expect(pgTypes.notices[0].file).toContain("README.md");
    expect(text).toContain("Copyright (c) 2014 Brian M. Carlson");
    expect(text).toContain("Copyright (c) 2013, Nick Fitzgerald");
    const webhook = manifest.packages.find(pkg => pkg.name === "standardwebhooks")!;
    expect(webhook.version).toBe("1.1.1");
    expect(webhook.notices[0].file).toBe("scripts/licenses/standardwebhooks-1.1.1-libraries.LICENSE");
    expect(webhook.notices[0].sourceUrl).toBe("https://raw.githubusercontent.com/standard-webhooks/standard-webhooks/b4d2c14fc5b4ccff3ff271e3b087dff812254c59/libraries/LICENSE");
    expect(webhook.notices[0].sha256).toBe("5ec8c7b26b64d881a6706617bed25c049f97f2f35de034c756de8546fd6dbe27");
    expect(text).toContain(fs.readFileSync(webhook.notices[0].file, "utf8").trimEnd());
    expect(text).toContain("Copyright (c) 2023 Svix (https://www.svix.com)");
    expect(text).not.toContain('select typname, oid, typarray from pg_type');
  });

  it("links the public notice file from the bilingual terms page", () => {
    const terms = fs.readFileSync("src/app/terms/page.tsx", "utf8");
    expect(terms).toContain('href="/third-party-notices.txt"');
    expect(terms).toContain("Open-source software licenses and notices");
    expect(terms).toContain("Licencias y avisos del software de código abierto");
    expect(fs.existsSync("public/third-party-notices.txt")).toBe(true);
  });
});
