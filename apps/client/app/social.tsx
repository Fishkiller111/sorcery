import React from 'react';
import { useThemePage } from '../src/theme/useThemePage';
import { DefaultSocialScreen } from '../src/pages/default/Social';

export default function Social() {
  const ThemedPage = useThemePage({
    default: DefaultSocialScreen,
  });

  if (ThemedPage) {
    return <ThemedPage />;
  }

  return <DefaultSocialScreen />;
}
