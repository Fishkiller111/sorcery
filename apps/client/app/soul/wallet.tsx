import React from 'react';
import { useThemePage } from '../../src/theme/useThemePage';
import DefaultSoulWallet from '../../src/pages/default/SoulWallet';

export default function SoulWalletScreen() {
  const ThemedPage = useThemePage({ default: DefaultSoulWallet });
  if (ThemedPage) return <ThemedPage />;
  return <DefaultSoulWallet />;
}
