import React from 'react';
import { useThemePage } from '../../src/theme/useThemePage';
import { DefaultAffiliateList } from '../../src/pages/default/AffiliateList';

export default function AffiliateListPage() {
  const ThemedPage = useThemePage({ default: DefaultAffiliateList });
  if (ThemedPage) return <ThemedPage />;
  return <DefaultAffiliateList />;
}
