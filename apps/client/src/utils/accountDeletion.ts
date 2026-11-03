/** Format deletion_scheduled_at for Settings display. */
export function formatDeletionScheduledDate(iso: string | undefined, lang: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale =
    lang === 'zh' ? 'zh-CN' : lang === 'jp' ? 'ja-JP' : lang === 'ru' ? 'ru-RU' : lang === 'es' ? 'es-ES' : 'en-US';
  try {
    return d.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d.toISOString();
  }
}
