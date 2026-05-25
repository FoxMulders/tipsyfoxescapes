declare global {
  interface Window {
    ai?: {
      languageModel?: {
        create?: () => Promise<{
          prompt: (text: string) => Promise<string>;
          destroy?: () => void;
        }>;
      };
    };
  }
}

export const extractJson = (text: string): string => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return text;
  return text.slice(start, end + 1);
};

/** Max time for one on-device `prompt()` so builder actions cannot hang forever. */
const BROWSER_AI_PROMPT_TIMEOUT_MS = 90_000;

export async function promptWithTimeout(
  model: { prompt: (text: string) => Promise<string> },
  text: string,
): Promise<string> {
  const result = await Promise.race([
    model.prompt(text).then((r) => ({ kind: "ok" as const, r })),
    new Promise<{ kind: "timeout" }>((resolve) => setTimeout(() => resolve({ kind: "timeout" }), BROWSER_AI_PROMPT_TIMEOUT_MS)),
  ]);
  if (result.kind === "timeout") {
    throw new Error("browser-ai-prompt-timeout");
  }
  return result.r;
}

/** Normalize Prompt API session responses (string or object with .text). */
export const normalizeModelText = (raw: unknown): string => {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "text" in raw && typeof (raw as { text: unknown }).text === "string") {
    return (raw as { text: string }).text;
  }
  return String(raw ?? "");
};

/** Best-effort detection for Chromium Prompt API and legacy `window.ai.languageModel`. */
export const isBrowserAiAvailable = (): boolean => {
  if (typeof globalThis === "undefined") return false;
  const g = globalThis as unknown as {
    ai?: { languageModel?: { create?: unknown } };
    LanguageModel?: { create?: unknown };
  };
  return typeof g.LanguageModel?.create === "function" || typeof g.ai?.languageModel?.create === "function";
};

type LanguageModelGlobal = {
  create?: (opts?: object) => Promise<unknown>;
  availability?: (opts?: object) => Promise<string>;
};

/** Async check: newer Chrome exposes `availability()` before `create` is obviously callable. */
export async function probeBrowserLanguageModel(): Promise<boolean> {
  if (isBrowserAiAvailable()) return true;
  const LM = (globalThis as unknown as { LanguageModel?: LanguageModelGlobal }).LanguageModel;
  if (!LM || typeof LM.availability !== "function") return false;
  const tryOnce = async (opts?: object): Promise<boolean> => {
    try {
      const a = opts ? await LM.availability!(opts) : await LM.availability!();
      return a === "available" || a === "downloadable" || a === "downloading";
    } catch {
      return false;
    }
  };
  if (
    await tryOnce({
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    } as object)
  ) {
    return true;
  }
  return tryOnce();
}

export const createLanguageModel = async (): Promise<{ prompt: (text: string) => Promise<string>; destroy?: () => void } | null> => {
  const g = globalThis as unknown as {
    LanguageModel?: {
      create?: (opts?: object) => Promise<{
        prompt: (input: unknown) => Promise<unknown>;
        destroy?: () => void;
      }>;
    };
    ai?: {
      languageModel?: {
        create?: () => Promise<{
          prompt: (text: string) => Promise<string>;
          destroy?: () => void;
        }>;
      };
    };
  };

  if (typeof g.LanguageModel?.create === "function") {
    let session: { prompt: (input: unknown) => Promise<unknown>; destroy?: () => void } | null = null;
    try {
      session = await g.LanguageModel.create({
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
      });
    } catch {
      try {
        session = await g.LanguageModel.create();
      } catch {
        session = null;
      }
    }
    if (session && typeof session.prompt === "function") {
      const boundPrompt = session.prompt.bind(session);
      return {
        prompt: async (text: string) => {
          let raw: unknown;
          try {
            raw = await boundPrompt([{ role: "user", content: text }]);
          } catch {
            raw = await boundPrompt(text);
          }
          return normalizeModelText(raw);
        },
        destroy: () => session.destroy?.(),
      };
    }
  }

  if (g.ai?.languageModel?.create) {
    try {
      return await g.ai.languageModel.create();
    } catch {
      return null;
    }
  }
  return null;
};
