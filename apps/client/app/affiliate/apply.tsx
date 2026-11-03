import React from 'react';
import { useThemePage } from '../../src/theme/useThemePage';
import { DefaultAffiliateApply } from '../../src/pages/default/AffiliateApply';

export default function AffiliateApplyPage() {
  const ThemedPage = useThemePage({ default: DefaultAffiliateApply });
  if (ThemedPage) return <ThemedPage />;
  return <DefaultAffiliateApply />;
}
