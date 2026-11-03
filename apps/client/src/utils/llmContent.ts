/** Unwrap assistant text when DB/WS still has raw LLM JSON envelope. */
export function unwrapAssistantContent(text: string): string {
  const trimmed = (text || '').trim();
  if (!trimmed.startsWith('{') || !trimmed.includes('"content"')) {
    return text;
  }

  try {
    const parsed = JSON.parse(trimmed) as { content?: unknown; tone?: unknown };
    if (typeof parsed.content === 'string' && parsed.content.trim()) {
      return parsed.content;
    }
  } catch {
    // fall through to loose extract
  }

  const loose = extractJsonStringField(trimmed, 'content');
  if (loose) return loose;

  return text;
}

function extractJsonStringField(raw: string, field: string): string {
  const key = `"${field}"`;
  const keyIdx = raw.indexOf(key);
  if (keyIdx < 0) return '';

  let i = keyIdx + key.length;
  while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t' || raw[i] === '\n' || raw[i] === ':')) {
    i += 1;
  }
  if (raw[i] !== '"') return '';
  i += 1;

  let out = '';
  while (i < raw.length) {
    const c = raw[i];
    if (c === '\\' && i + 1 < raw.length) {
      const next = raw[i + 1];
      if (next === 'n') out += '\n';
      else if (next === 'r') out += '\r';
      else if (next === 't') out += '\t';
      else out += next;
      i += 2;
      continue;
    }
    if (c === '"') break;
    out += c;
    i += 1;
  }
  return out;
}
