import type { Lang } from '../i18n/types';
import { LANG_FALLBACK } from '../i18n/langs';
import type { AgentProfile } from '../engine/types';

export function resolveAgentName(agent: Pick<AgentProfile, 'name' | 'nameEn' | 'nameJp' | 'nameRu' | 'nameEs'>, lang: Lang): string {
  const byLang: Partial<Record<Lang, string | undefined>> = {
    zh: agent.name,
    en: agent.nameEn ?? agent.name,
    jp: agent.nameJp ?? agent.nameEn ?? agent.name,
    ru: agent.nameRu ?? agent.nameEn ?? agent.name,
    es: agent.nameEs ?? agent.nameEn ?? agent.name,
  };
  for (const code of LANG_FALLBACK[lang]) {
    const value = byLang[code];
    if (value) return value;
  }
  return agent.name;
}
