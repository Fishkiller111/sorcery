import { apiFetch } from './client';
import type { ListActiveAnnouncementsResp } from '../types/api';

export const ANNOUNCEMENT_PLACEMENT_PROFILE = 'profile';
export const ANNOUNCEMENT_PLACEMENT_HOME = 'home';

export async function fetchActiveAnnouncements(locale: string, placement?: string) {
  const params = new URLSearchParams();
  params.set('locale', locale);
  if (placement?.trim()) {
    params.set('placement', placement.trim());
  }
  return apiFetch<ListActiveAnnouncementsResp>(`/announcements/active?${params.toString()}`);
}
