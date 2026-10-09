import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isLocalReviewMode } from "../src/lib/local-review";

afterEach(() => vi.unstubAllEnvs());

describe("development-only local review", () => {
  it.each(["production", "test", "", undefined])("fails closed in %s even with the review flag", mode => {
    vi.stubEnv("NODE_ENV", mode);
    vi.stubEnv("ITZLI_LOCAL_REVIEW", "1");
    vi.stubEnv("VERCEL", "0");
    expect(isLocalReviewMode()).toBe(false);
  });

  it.each(["", "0", "true", undefined])("requires the exact explicit flag %s", flag => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ITZLI_LOCAL_REVIEW", flag);
    vi.stubEnv("VERCEL", "0");
    expect(isLocalReviewMode()).toBe(false);
  });

  it("rejects Vercel in development and permits an explicit local development review", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ITZLI_LOCAL_REVIEW", "1");
    vi.stubEnv("VERCEL", "1");
    expect(isLocalReviewMode()).toBe(false);
    vi.stubEnv("VERCEL", "0");
    expect(isLocalReviewMode()).toBe(true);
  });
});

describe.each(["scripts/dev-local.js", "scripts/review-local.js"])("loopback launcher %s", filename => {
  function run(argv: string[] = []) {
    const spawn = vi.fn(() => ({ on: vi.fn() }));
    vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
      require: (name: string) => name === "node:child_process" ? { spawn } : path,
      process: { argv: ["node", filename, ...argv], execPath: "node", cwd: () => process.cwd(),
        env: { NODE_ENV: "production", VERCEL: "1", HOST: "0.0.0.0", HOSTNAME: "0.0.0.0", PORT: "80", ITZLI_LOCAL_REVIEW: "0" },
        exit: vi.fn() },
    });
    return spawn;
  }

  it("uses a development server with fixed loopback arguments despite hostile inherited settings", () => {
    const spawn = run();
    expect(spawn).toHaveBeenCalledOnce();
    const [binary, args, options] = spawn.mock.calls[0] as unknown as [string, string[], { env: Record<string, string> }];
    expect(binary).toBe("node");
    expect(args).toEqual([path.join(process.cwd(), "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3000"]);
    expect(options.env).toMatchObject({ NODE_ENV: "development", ITZLI_LOCAL_REVIEW: "1", VERCEL: "0",
      ITZLI_LOCAL_IMAGE_REVIEW_LEDGER: path.join(process.cwd(), "data/openai-word-images-pending.json") });
  });

  it("rejects forwarded arguments that could expose the review server", () => {
    expect(() => run(["--hostname", "0.0.0.0"])).toThrow("custom launch arguments are not supported");
  });
});
