export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type SupportLlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  referer: string;
};

export class SupportLlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SupportLlmError";
  }
}

/** OpenAI 兼容 Chat Completions（仅客服路径） */
export async function chatCompletion(
  cfg: SupportLlmConfig,
  messages: LlmMessage[],
): Promise<string> {
  const base = cfg.baseUrl.replace(/\/+$/, "");
  const url = `${base}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
      // OpenRouter 建议头（与后端 pkg/llm 一致）
      "HTTP-Referer": cfg.referer,
      "X-Title": "Soulthread Bot Support",
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SupportLlmError(
      `LLM HTTP ${res.status}: ${text.slice(0, 200)}`,
      res.status,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) {
    throw new SupportLlmError("LLM returned empty content");
  }
  return content;
}
