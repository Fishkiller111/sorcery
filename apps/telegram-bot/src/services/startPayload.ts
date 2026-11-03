export type StartPayloadKind =
  | "none"
  | "agent"
  | "aff"
  | "src"
  | "ch"
  | "unknown";

export type ParsedStartPayload = {
  raw: string;
  kind: StartPayloadKind;
  /** agent / role id when kind=agent (may also carry affCode / channelCode) */
  agentId?: string;
  /** RevShare aff code (`aff_` or legacy `ref_`) */
  affCode?: string;
  /** @deprecated use affCode — kept for event compat */
  refCode?: string;
  /** traffic source tag when kind=src (compat → channelCode) */
  source?: string;
  /** growth channel code (`ch_` or mapped from `src_`) */
  channelCode?: string;
};

function takeAff(segment: string | undefined): string | undefined {
  if (!segment) return undefined;
  const m = segment.match(/^(?:aff|ref)[_-](.+)$/i);
  return m?.[1];
}

function takeChannel(segment: string | undefined): string | undefined {
  if (!segment) return undefined;
  const ch = segment.match(/^ch[_-]([a-z0-9_]{2,32})$/i);
  if (ch?.[1]) return ch[1].toLowerCase();
  return undefined;
}

/**
 * Deep Link payloads:
 * - agent_<id>
 * - agent_<id>__ch_<code>[__aff_<code>]
 * - agent_<id>__aff_<code>
 * - ch_<code>[__aff_<code>]
 * - aff_<code> / ref_<code>
 * - src_<tag>  (compat → channel)
 */
export function parseStartPayload(raw: string | undefined): ParsedStartPayload {
  const value = (raw ?? "").trim();
  if (!value) {
    return { raw: "", kind: "none" };
  }

  const parts = value.split("__");
  const head = parts[0] ?? "";
  const rest = parts.slice(1);

  let channelCode: string | undefined;
  let affCode: string | undefined;
  for (const seg of rest) {
    channelCode = channelCode || takeChannel(seg);
    const aff = takeAff(seg);
    if (aff) affCode = aff;
  }

  const agent = head.match(/^agent[_-](.+)$/i);
  if (agent?.[1]) {
    // legacy agent__aff without ch
    if (!affCode && rest.length === 1) {
      const onlyAff = takeAff(rest[0]);
      if (onlyAff) affCode = onlyAff;
    }
    return {
      raw: value,
      kind: "agent",
      agentId: agent[1],
      affCode,
      refCode: affCode,
      channelCode,
      source: channelCode,
    };
  }

  const headChannel = takeChannel(head);
  if (headChannel) {
    return {
      raw: value,
      kind: "ch",
      channelCode: headChannel,
      source: headChannel,
      affCode,
      refCode: affCode,
    };
  }

  const aff = head.match(/^(?:aff|ref)[_-](.+)$/i);
  if (aff?.[1]) {
    const code = aff[1];
    return { raw: value, kind: "aff", affCode: code, refCode: code, channelCode };
  }

  const src = head.match(/^src[_-](.+)$/i);
  if (src?.[1]) {
    const tag = src[1].toLowerCase();
    return { raw: value, kind: "src", source: tag, channelCode: tag };
  }

  return { raw: value, kind: "unknown", channelCode, affCode, refCode: affCode };
}
