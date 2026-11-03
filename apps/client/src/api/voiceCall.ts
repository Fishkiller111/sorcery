import { apiFetch } from './client';

/** eleven_agents = classic realtime voice; digital_human = LiveKit + LemonSlice */
export type VoiceCallMode = 'eleven_agents' | 'digital_human' | string;

export type StartVoiceCallReq = {
  session_id: string;
  role_id: string;
  /** eleven_agents = classic voice; digital_human = LiveKit avatar (explicit entry only). */
  mode?: VoiceCallMode;
};

export type ConversationOverride = {
  first_message: string;
  voice_id: string;
  language: string;
  custom_llm_extra_body: Record<string, string>;
};

export type LiveKitJoinInfo = {
  server_url: string;
  token: string;
  room_name: string;
};

export type StartVoiceCallResp = {
  call_id: string;
  mode?: VoiceCallMode;
  signed_url?: string;
  agent_id?: string;
  voice_id: string;
  agent_image_url?: string;
  livekit?: LiveKitJoinInfo;
  conversation_override: ConversationOverride;
};

export type EndVoiceCallResp = {
  call_id: string;
  duration_sec: number;
  quota_cost: number;
  end_reason: string;
};

export type VoiceCallStatusResp = {
  active: boolean;
  call_id?: string;
  session_id?: string;
  role_id?: string;
  voice_id?: string;
  mode?: VoiceCallMode;
  started_at?: number;
  elapsed_sec: number;
  billed_units: number;
  remaining_quota: number;
  quota_unlimited: boolean;
  force_end?: boolean;
  force_end_reason?: string;
};

export function isDigitalHumanCall(start: StartVoiceCallResp): boolean {
  if (start.mode === 'digital_human') return true;
  return Boolean(start.livekit?.server_url && start.livekit?.token);
}

export function startVoiceCall(body: StartVoiceCallReq) {
  return apiFetch<StartVoiceCallResp>('/chat/call/start', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function endVoiceCall(callId: string) {
  return apiFetch<EndVoiceCallResp>('/chat/call/end', {
    method: 'POST',
    body: JSON.stringify({ call_id: callId }),
    // Survive overlay unmount / WebRTC teardown (avoids noisy "Failed to fetch").
    keepalive: true,
  });
}

/** Hangup path: never throw — network races during LiveKit disconnect are expected. */
export async function endVoiceCallBestEffort(callId: string): Promise<EndVoiceCallResp | null> {
  try {
    return await endVoiceCall(callId);
  } catch {
    return null;
  }
}

export function getVoiceCallStatus(params: { callId?: string; sessionId?: string }) {
  const q = new URLSearchParams();
  if (params.callId) q.set('call_id', params.callId);
  if (params.sessionId) q.set('session_id', params.sessionId);
  return apiFetch<VoiceCallStatusResp>(`/chat/call/status?${q.toString()}`);
}

/** Report first_frame / bot_ready latency for Prometheus (best-effort). */
export function reportVoiceCallEvent(body: {
  call_id: string;
  event: 'first_frame' | 'bot_ready';
  latency_ms?: number;
}) {
  return apiFetch<{ ok: boolean }>('/chat/call/event', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
