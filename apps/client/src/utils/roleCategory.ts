export const ROLE_CATEGORY_MYSELF_ID = 'myself';
export const ROLE_CATEGORY_HISTORY_ID = 'history';

export function resolveRoleCategoryName(
  categoryId: string,
  apiName: string,
  t: (key: string) => string,
): string {
  if (categoryId === ROLE_CATEGORY_MYSELF_ID) {
    return t('freeChat.categoryMyself');
  }
  if (categoryId === ROLE_CATEGORY_HISTORY_ID) {
    return t('freeChat.categoryHistory');
  }
  return apiName;
}

export function sortRoleCategories<T extends { category_id: string; name: string }>(
  categories: T[],
): T[] {
  return [...categories].sort((a, b) => {
    if (a.category_id === ROLE_CATEGORY_MYSELF_ID) return -1;
    if (b.category_id === ROLE_CATEGORY_MYSELF_ID) return 1;
    if (a.category_id === ROLE_CATEGORY_HISTORY_ID) return -1;
    if (b.category_id === ROLE_CATEGORY_HISTORY_ID) return 1;
    return a.name.localeCompare(b.name);
  });
}
