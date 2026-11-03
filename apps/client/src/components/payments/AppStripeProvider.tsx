import React from 'react';

type Props = {
  children: React.ReactElement | React.ReactElement[];
};

/**
 * Native Stripe SDK removed (PassKit / Apple Pay cleanup for App Store 2.1).
 * VIP: iOS = StoreKit IAP; Web/Android = Stripe Checkout in system browser.
 * Kept as a passthrough so call sites stay stable.
 */
export function AppStripeProvider({ children }: Props) {
  return <>{children}</>;
}
