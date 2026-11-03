export function isVerifiedRealPerson(item?: {
  verified_real_person?: boolean;
  official_subtype?: string;
  source?: string;
} | null): boolean {
  if (!item) return false;
  if (item.verified_real_person) return true;
  return (
    (item.source || '').trim().toLowerCase() === 'official' &&
    (item.official_subtype || '').trim().toLowerCase() === 'real_person'
  );
}
