import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyLocale, WIZARD_STEPS, type BasicsDraft, type LocaleFields, type StyleDraft, type WizardStep } from './types';
import type { RoleEventInput } from '../../types/api';

const KEY_PREFIX = '@soulthread/create-agent-draft/';

export type CreateAgentDraftV1 = {
  version: 1;
  step: WizardStep;
  maxReachedIndex: number;
  styleDraft: StyleDraft;
  basicsDraft: BasicsDraft;
  locale: LocaleFields;
  tagInput: string;
  figureUrl: string;
  /** In-flight async preview job; resume poll on return */
  previewRecordId: string;
  voiceReferenceId: string;
  showAdvanced: boolean;
  /** Optional: editable interaction buttons in personality step */
  events?: RoleEventInput[];
};

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function isWizardStep(value: unknown): value is WizardStep {
  return typeof value === 'string' && (WIZARD_STEPS as string[]).includes(value);
}

function parseDraftEvents(raw: unknown): RoleEventInput[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: RoleEventInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Partial<RoleEventInput>;
    if (typeof e.event_name !== 'string' || !e.event_name.trim()) continue;
    out.push({
      event_name: e.event_name,
      display_name: typeof e.display_name === 'string' ? e.display_name : '',
      prompt_suffix: typeof e.prompt_suffix === 'string' ? e.prompt_suffix : '',
      sort_order: typeof e.sort_order === 'number' ? e.sort_order : out.length,
      cooldown_seconds: typeof e.cooldown_seconds === 'number' ? e.cooldown_seconds : 10,
      is_active: e.is_active !== false,
    });
  }
  return out.length > 0 ? out : undefined;
}

export async function loadCreateAgentDraft(userId: string): Promise<CreateAgentDraftV1 | null> {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CreateAgentDraftV1>;
    if (parsed.version !== 1) return null;
    const step = isWizardStep(parsed.step) ? parsed.step : 'style';
    const maxReachedIndex = Math.max(
      0,
      Math.min(
        WIZARD_STEPS.length - 1,
        typeof parsed.maxReachedIndex === 'number' ? parsed.maxReachedIndex : WIZARD_STEPS.indexOf(step),
      ),
    );
    return {
      version: 1,
      step,
      maxReachedIndex,
      styleDraft: parsed.styleDraft && typeof parsed.styleDraft === 'object' ? parsed.styleDraft : {},
      basicsDraft: parsed.basicsDraft && typeof parsed.basicsDraft === 'object' ? parsed.basicsDraft : {},
      locale:
        parsed.locale && typeof parsed.locale === 'object'
          ? { ...emptyLocale(), ...parsed.locale, personality: Array.isArray(parsed.locale.personality) ? parsed.locale.personality : [] }
          : emptyLocale(),
      tagInput: typeof parsed.tagInput === 'string' ? parsed.tagInput : '',
      figureUrl: typeof parsed.figureUrl === 'string' ? parsed.figureUrl : '',
      previewRecordId: typeof parsed.previewRecordId === 'string' ? parsed.previewRecordId : '',
      voiceReferenceId: typeof parsed.voiceReferenceId === 'string' ? parsed.voiceReferenceId : '',
      showAdvanced: Boolean(parsed.showAdvanced),
      events: parseDraftEvents(parsed.events),
    };
  } catch {
    return null;
  }
}

export async function saveCreateAgentDraft(userId: string, draft: CreateAgentDraftV1): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(draft));
  } catch {
    // ignore storage failures
  }
}

export async function clearCreateAgentDraft(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}
