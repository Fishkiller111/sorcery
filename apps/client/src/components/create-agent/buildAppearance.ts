import {
  ART_STYLE_OPTIONS,
  GENDER_OPTIONS,
} from './options/styleOptions';
import {
  BODY_TYPE_OPTIONS,
  ETHNICITY_OPTIONS,
  HAIR_STYLE_OPTIONS,
} from './options/basicsOptions';
import { CUSTOM_OPTION_ID, type BasicsDraft, type OptionDef, type StyleDraft } from './types';
import { ageAppearancePart, DEFAULT_AGE } from './age';

function partFromOptions(options: OptionDef[], id?: string): string | undefined {
  if (!id) return undefined;
  return options.find((o) => o.id === id)?.appearancePart;
}

function partOrCustom(
  options: OptionDef[],
  id: string | undefined,
  customText: string | undefined,
): string | undefined {
  if (!id) return undefined;
  if (id === CUSTOM_OPTION_ID) {
    const trimmed = customText?.trim();
    return trimmed || undefined;
  }
  return partFromOptions(options, id);
}

export function buildAppearanceFromDraft(style: StyleDraft, basics: BasicsDraft): string {
  const parts = [
    partFromOptions(GENDER_OPTIONS, style.gender),
    ageAppearancePart(style.age ?? DEFAULT_AGE),
    partFromOptions(ART_STYLE_OPTIONS, style.artStyle),
    partOrCustom(ETHNICITY_OPTIONS, basics.ethnicity, basics.ethnicityCustom),
    partOrCustom(HAIR_STYLE_OPTIONS, basics.hairStyle, basics.hairStyleCustom),
    partOrCustom(BODY_TYPE_OPTIONS, basics.bodyType, basics.bodyTypeCustom),
  ].filter(Boolean);

  if (parts.length === 0) return '';
  return parts.join(', ');
}

export function basicsFieldSatisfied(draft: BasicsDraft, field: 'ethnicity' | 'hairStyle' | 'bodyType'): boolean {
  if (field === 'ethnicity') {
    if (!draft.ethnicity) return false;
    if (draft.ethnicity === CUSTOM_OPTION_ID) return Boolean(draft.ethnicityCustom?.trim());
    return true;
  }
  if (field === 'hairStyle') {
    if (!draft.hairStyle) return false;
    if (draft.hairStyle === CUSTOM_OPTION_ID) return Boolean(draft.hairStyleCustom?.trim());
    return true;
  }
  if (!draft.bodyType) return false;
  if (draft.bodyType === CUSTOM_OPTION_ID) return Boolean(draft.bodyTypeCustom?.trim());
  return true;
}

export function basicsDraftComplete(draft: BasicsDraft): boolean {
  return (
    basicsFieldSatisfied(draft, 'ethnicity')
    && basicsFieldSatisfied(draft, 'hairStyle')
    && basicsFieldSatisfied(draft, 'bodyType')
  );
}
