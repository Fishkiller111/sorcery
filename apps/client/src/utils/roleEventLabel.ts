/** Localized label for standard interaction events; falls back to API display_name for custom events. */
export function resolveRoleEventLabel(
  eventName: string,
  apiDisplayName: string,
  t: (key: string) => string,
): string {
  const key = `chat.interaction.${eventName}`;
  const localized = t(key);
  if (localized !== key) return localized;
  return apiDisplayName;
}
