import { createElement, type Key } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WordCardMedia } from "@/components/WordCardMedia";
import type { WordImage } from "@/data/word-images";

const state = vi.hoisted(() => ({ locale: "en", failed: false, retryCount: 0,
  imageKey: undefined as Key | undefined, imageUrl: "",
  onError: undefined as (() => void) | undefined, onRetry: undefined as (() => void) | undefined }));
vi.mock("@/i18n/LocaleProvider", () => ({ useLocale: () => ({ locale: state.locale }) }));
vi.mock("@/components/WordImageResourceHints", () => ({ WordImagePreloads: () => null }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useState: (initial: unknown) => {
    if (initial === false) return [state.failed, (value: boolean) => { state.failed = value; }];
    if (initial === 0) return [state.retryCount, (value: number | ((current: number) => number)) => {
      state.retryCount = typeof value === "function" ? value(state.retryCount) : value;
    }];
    return actual.useState(initial);
  } };
});
vi.mock("react/jsx-runtime", async () => {
  const actual = await vi.importActual<typeof import("react/jsx-runtime")>("react/jsx-runtime");
  const capture = (render: typeof actual.jsx) => (...args: Parameters<typeof actual.jsx>) => {
    const [type, rawProps, key] = args;
    const props = rawProps as Record<string, unknown>;
    if (type === "img") {
      state.imageKey = key;
      state.imageUrl = props.src as string;
      state.onError = props.onError as () => void;
    }
    if (type === "button") state.onRetry = props.onClick as () => void;
    return render(...args);
  };
  return { ...actual, jsx: capture(actual.jsx), jsxs: capture(actual.jsxs) };
});
vi.mock("react/jsx-dev-runtime", async () => {
  const actual = await vi.importActual<typeof import("react/jsx-dev-runtime")>("react/jsx-dev-runtime");
  return { ...actual, jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
    const [type, rawProps, key] = args;
    const props = rawProps as Record<string, unknown>;
    if (type === "img") {
      state.imageKey = key;
      state.imageUrl = props.src as string;
      state.onError = props.onError as () => void;
    }
    if (type === "button") state.onRetry = props.onClick as () => void;
    return actual.jsxDEV(...args);
  } };
});

const image: WordImage = { url: "/api/local-review/images/exact-word?v=immutable-hash", author: "Itzli", license: "Local review", source: "itzli" };
const render = () => renderToStaticMarkup(createElement(WordCardMedia, { image, alt: "Image for this word" }));

beforeEach(() => { state.locale = "en"; state.failed = false; state.retryCount = 0;
  state.onError = undefined; state.onRetry = undefined; state.imageKey = undefined; state.imageUrl = ""; });

describe("word card image failure and retry", () => {
  it("keeps a visible failure notice and retries the exact immutable asset", () => {
    expect(render()).toContain(`src="${image.url}"`);
    const firstKey = state.imageKey;
    state.onError!();
    const failedMarkup = render();
    expect(failedMarkup).toContain("The image could not load.");
    expect(failedMarkup).toContain("Retry image");
    expect(failedMarkup).not.toContain("<img");
    state.onRetry!();
    const retriedMarkup = render();
    expect(retriedMarkup).toContain(`src="${image.url}"`);
    expect(retriedMarkup).not.toContain("The image could not load.");
    expect(state.imageKey).not.toBe(firstKey);
    expect(state.imageUrl).toBe(image.url);
  });

  it("localizes the visible failure notice and retry action for Spanish learners", () => {
    state.locale = "es";
    render(); state.onError!();
    const markup = render();
    expect(markup).toContain("No se pudo cargar la imagen.");
    expect(markup).toContain("Volver a cargar la imagen");
    expect(markup).not.toContain("Retry image");
  });

  it("does not introduce fallback artwork when no reviewed image exists", () => {
    expect(renderToStaticMarkup(createElement(WordCardMedia, { image: null, alt: "Word" }))).toBe("");
  });
});
