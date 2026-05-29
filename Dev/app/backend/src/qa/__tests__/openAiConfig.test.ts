import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { isOpenAiConfigured } from "../../openAiConfig.js";

describe("isOpenAiConfigured", () => {
  const prior = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (prior === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prior;
  });

  it("returns false when key missing", () => {
    delete process.env.OPENAI_API_KEY;
    expect(isOpenAiConfigured()).toBe(false);
  });

  it("returns true when sk- key present", () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    expect(isOpenAiConfigured()).toBe(true);
  });
});
