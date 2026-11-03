export type ChatDisplayPart = {
  kind: 'dialogue' | 'action';
  text: string;
};

export type ChatDisplayBlock = ChatDisplayPart;

/** Matches (action), （动作）, *action* stage directions embedded in assistant replies. */
const ACTION_CHUNK =
  /\([^)]*\)|（[^）]*）|\*[^*]+\*/g;

export function parseChatDisplayParts(text: string): ChatDisplayPart[] {
  const input = (text || '').trim();
  if (!input) return [];

  const parts: ChatDisplayPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  ACTION_CHUNK.lastIndex = 0;
  while ((match = ACTION_CHUNK.exec(input)) !== null) {
    const start = match.index;
    if (start > lastIndex) {
      parts.push({ kind: 'dialogue', text: input.slice(lastIndex, start) });
    }
    parts.push({ kind: 'action', text: match[0] });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < input.length) {
    parts.push({ kind: 'dialogue', text: input.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return [{ kind: 'dialogue', text: input }];
  }

  return parts.filter((p) => p.text.length > 0);
}

export function hasChatActionMarkup(text: string): boolean {
  ACTION_CHUNK.lastIndex = 0;
  return ACTION_CHUNK.test(text || '');
}

/** Turn a wall of RP text into readable paragraphs (action vs dialogue, then sentence wraps). */
export function buildChatDisplayBlocks(text: string): ChatDisplayBlock[] {
  const raw = (text || '').replace(/\r\n/g, '\n');
  if (!raw.trim()) return [];

  const parts = hasChatActionMarkup(raw)
    ? parseChatDisplayParts(raw)
    : [{ kind: 'dialogue' as const, text: raw }];

  const blocks: ChatDisplayBlock[] = [];
  for (const part of parts) {
    for (const chunk of splitPreservedParagraphs(part.text, part.kind)) {
      blocks.push({ kind: part.kind, text: chunk });
    }
  }
  return blocks;
}

function splitPreservedParagraphs(text: string, kind: ChatDisplayPart['kind']): string[] {
  const pieces = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (pieces.length === 0) return [];

  const out: string[] = [];
  for (const piece of pieces) {
    out.push(...wrapReadableSentences(piece, kind));
  }
  return out;
}

function targetLen(text: string): number {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  return cjk / Math.max(text.length, 1) > 0.3 ? 88 : 128;
}

function wrapReadableSentences(text: string, kind: ChatDisplayPart['kind']): string[] {
  const maxLen = targetLen(text);
  if (text.length <= maxLen) return [text];

  const sentences = splitSentences(text);
  if (sentences.length <= 1) {
    return splitByLength(text, maxLen);
  }

  // Actions keep each beat short; dialogue groups ~2 sentences / target length.
  if (kind === 'action') {
    return sentences.length > 2 || text.length > maxLen * 1.35
      ? sentences
      : [text];
  }

  const paras: string[] = [];
  let buf = '';
  for (const sentence of sentences) {
    const combined = joinFragments(buf, sentence);
    if (buf && combined.length > maxLen) {
      paras.push(buf);
      buf = sentence;
    } else {
      buf = combined;
    }
  }
  if (buf) paras.push(buf);
  return paras;
}

function joinFragments(left: string, right: string): string {
  if (!left) return right;
  if (/[\u4e00-\u9fff]$/.test(left) || /^[\u4e00-\u9fff]/.test(right)) {
    return `${left}${right}`;
  }
  return `${left} ${right}`;
}

function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    buf += ch;
    const end = sentenceEndIndex(text, i);
    if (end < 0) continue;
    while (i < end) {
      i += 1;
      buf += text[i];
    }
    while (text[i + 1] === ' ' || text[i + 1] === '\t') {
      i += 1;
    }
    const piece = buf.trim();
    if (piece) out.push(piece);
    buf = '';
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

function sentenceEndIndex(text: string, i: number): number {
  const ch = text[i];
  if (ch === '。' || ch === '！' || ch === '？' || ch === '…') return i;
  if (ch === '!' || ch === '?') return i;
  if (ch !== '.') return -1;
  if (text[i + 1] === '.') {
    let j = i;
    while (text[j] === '.') j += 1;
    return j - 1;
  }
  const next = text[i + 1];
  if (next === undefined || next === ' ' || next === '\n' || next === '"' || next === '”') {
    return i;
  }
  return -1;
}

function splitByLength(text: string, maxLen: number): string[] {
  const out: string[] = [];
  let rest = text.trim();
  const breaks = new Set([' ', '，', ',', '、', '；', ';', '：', ':']);
  while (rest.length > maxLen) {
    let idx = maxLen;
    const floor = Math.floor(maxLen * 0.55);
    for (let i = maxLen; i >= floor; i -= 1) {
      if (breaks.has(rest[i])) {
        idx = i + (rest[i] === ' ' ? 0 : 1);
        break;
      }
    }
    out.push(rest.slice(0, idx).trim());
    rest = rest.slice(idx).trim();
  }
  if (rest) out.push(rest);
  return out;
}
