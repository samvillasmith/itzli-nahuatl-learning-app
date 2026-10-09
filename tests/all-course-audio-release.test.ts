import {createRequire} from "node:module";
import {describe, expect, it} from "vitest";
const require = createRequire(import.meta.url);
const release = require("../scripts/generate-all-course-audio.cjs");
const recipe = require("../scripts/generate-google-audio.js");

function wave(silent = false) {
  const pcm = Buffer.alloc(9600);
  if (!silent) for (let i = 0; i < pcm.length; i += 2) pcm.writeInt16LE(Math.round(4000 * Math.sin(i / 16)), i);
  const header = Buffer.alloc(44);
  header.write("RIFF"); header.writeUInt32LE(pcm.length + 36, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24); header.writeUInt32LE(48000, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

describe("all-course audio release validation", () => {
  it("accepts complete audible PCM and rejects malformed, silent, or unexpected-format files", () => {
    expect(release.wavInfo(wave())).toMatchObject({sample_rate: 24000, channels: 1, bits: 16, duration_seconds: 0.2});
    expect(() => release.wavInfo(Buffer.from("fake provider success"))).toThrow("Missing RIFF");
    expect(() => release.wavInfo(wave(true))).toThrow("silent");
    expect(() => release.wavInfo(wave().subarray(0, 90))).toThrow("Truncated WAV");
    const stereo = wave(); stereo.writeUInt16LE(2, 22);
    expect(() => release.wavInfo(stereo)).toThrow("Unexpected WAV format");
  });
  it("pins the owner-approved recipe in both the provider request and immutable job identity", () => {
    const ssml = recipe.buildSsml("atl", {inputMode: "phoneme"});
    const request = release.requestForJob({ssml});
    expect(request).toMatchObject({input: {ssml}, voice: {languageCode: "es-US", name: "es-US-Standard-A"}, audioConfig: {audioEncoding: "LINEAR16", speakingRate: 0.82, pitch: 0, sampleRateHertz: 24000}});
    expect(ssml).toContain('"atx');
    expect(release.jobIdForSsml(ssml)).toMatch(/^[a-f0-9]{64}$/);
    expect(release.jobIdForSsml(ssml)).not.toBe(release.jobIdForSsml(recipe.buildSsml("sintli", {inputMode: "phoneme"})));
  });
});
