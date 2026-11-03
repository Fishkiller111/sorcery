import React from 'react';
import { useThemePage } from '../../src/theme/useThemePage';
import { DefaultContestDetail } from '../../src/pages/default/ContestDetail';

export default function ContestDetailPage() {
  const ThemedPage = useThemePage({ default: DefaultContestDetail });
  if (ThemedPage) return <ThemedPage />;
  return <DefaultContestDetail />;
}
