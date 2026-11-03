import React from 'react';

type Props = {
  children: React.ReactNode;
};

/** Web: Stripe Platform Pay not used; pass through. */
export function AppStripeProvider({ children }: Props) {
  return <>{children}</>;
}
