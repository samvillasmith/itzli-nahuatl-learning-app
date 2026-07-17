import { describe, expect, it } from "vitest";
import { TUTOR_FEATURE_ENABLED } from "../src/lib/features";

describe("paid feature controls", () => {
  it("keeps the AI tutor disabled by default and in production builds", () => {
    expect(TUTOR_FEATURE_ENABLED).toBe(false);
  });
});
