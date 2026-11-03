import React from 'react';
import { useThemePage } from '../../src/theme/useThemePage';
import { DefaultAnnouncements } from '../../src/pages/default/Announcements';

export default function AnnouncementsPage() {
  const ThemedPage = useThemePage({ default: DefaultAnnouncements });
  if (ThemedPage) return <ThemedPage />;
  return <DefaultAnnouncements />;
}
