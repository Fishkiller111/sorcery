import AsyncStorage from '@react-native-async-storage/async-storage';

/** v3: consent copy names Soulthread official + AnchorResonance AI Corp only. */
const STORAGE_KEY = '@soulthread_ai_data_consent_v3';

export type AiDataConsentRecord = {
  accepted: true;
  acceptedAt: string;
};

export async function loadAiDataConsent(): Promise<AiDataConsentRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AiDataConsentRecord>;
    if (parsed?.accepted !== true || typeof parsed.acceptedAt !== 'string') return null;
    return { accepted: true, acceptedAt: parsed.acceptedAt };
  } catch {
    return null;
  }
}

export async function saveAiDataConsentAccepted(): Promise<AiDataConsentRecord> {
  const record: AiDataConsentRecord = {
    accepted: true,
    acceptedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return record;
}
