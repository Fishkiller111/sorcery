import { apiFetch } from './client';

/** Public feature flags from API. Default all false when missing/unavailable. */
export type ConfigFeaturesResp = {
  simulator_public_enabled?: boolean;
};

/**
 * GET /config/features — client sync for launch gates (e.g. Simulator.PublicEnabled).
 * Failures are swallowed by callers; never hardcode true on the client.
 */
export async function fetchConfigFeatures(): Promise<ConfigFeaturesResp> {
  return apiFetch<ConfigFeaturesResp>('/config/features');
}
