import React from 'react';
import { useThemePage } from '../../src/theme/useThemePage';
import { DefaultCampaignDetail } from '../../src/pages/default/CampaignDetail';

export default function CampaignDetailPage() {
  const ThemedPage = useThemePage({ default: DefaultCampaignDetail });
  if (ThemedPage) return <ThemedPage />;
  return <DefaultCampaignDetail />;
}
