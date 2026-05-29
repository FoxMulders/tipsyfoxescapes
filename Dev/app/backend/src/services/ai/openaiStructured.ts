import { z } from "zod";

export type StructuredOpenAiOptions<T extends z.ZodType> = {
  apiKey: string;
  model?: string;
  system: string;
  user: string;
  schema: T;
  schemaName: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

const stripSchemaMeta = (schema: Record<string, unknown>): Record<string, unknown> => {
  const { $schema: _s, ...rest } = schema;
  return rest;
};

export const zodToOpenAiJsonSchema = (schema: z.ZodType): Record<string, unknown> =>
  stripSchemaMeta(z.toJSONSchema(schema) as Record<string, unknown>);

export async function callOpenAiStructured<T extends z.ZodType>(
  options: StructuredOpenAiOptions<T>,
): Promise<z.infer<T>> {
  const {
    apiKey,
    model = "gpt-4o-mini",
    system,
    user,
    schema,
    schemaName,
    temperature = 0.7,
    maxTokens = 2800,
    timeoutMs = 55_000,
  } = options;

  const jsonSchema = zodToOpenAiJsonSchema(schema);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema: jsonSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI structured ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string | null; refusal?: string | null } }>;
  };
  const raw = data.choices[0]?.message?.content;
  if (!raw) {
    const refusal = data.choices[0]?.message?.refusal;
    throw new Error(refusal ? `OpenAI refused: ${refusal}` : "Empty structured OpenAI response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Structured OpenAI response was not valid JSON");
  }

  return schema.parse(parsed);
}
