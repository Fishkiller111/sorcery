import React from 'react';
import { useThemePage } from '../../src/theme/useThemePage';
import { DefaultAnnouncementDetail } from '../../src/pages/default/AnnouncementDetail';

export default function AnnouncementDetailPage() {
  const ThemedPage = useThemePage({ default: DefaultAnnouncementDetail });
  if (ThemedPage) return <ThemedPage />;
  return <DefaultAnnouncementDetail />;
}
