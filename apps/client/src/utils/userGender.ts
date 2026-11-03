import type { UserGender, UserInfo } from '../types/api';

export type GenderOption = Exclude<UserGender, ''>;

export const GENDER_OPTIONS: GenderOption[] = ['male', 'female', 'other'];

export function genderLabelKey(gender: UserGender): string {
  switch (gender) {
    case 'male':
      return 'settings.genderMale';
    case 'female':
      return 'settings.genderFemale';
    case 'other':
      return 'settings.genderOther';
    default:
      return 'settings.genderUnset';
  }
}

export function formatUserGenderDisplay(
  user: Pick<UserInfo, 'gender' | 'gender_custom'> | null | undefined,
  t: (key: string) => string,
): string {
  const gender = user?.gender ?? '';
  if (!gender) return t('settings.genderUnset');
  if (gender === 'other') {
    const custom = user?.gender_custom?.trim();
    return custom || t('settings.genderOther');
  }
  return t(genderLabelKey(gender));
}
