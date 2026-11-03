import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

/** Keep logged-in users off the login screen; guests may browse home. */
export function AuthRouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);

  useEffect(() => {
    if (!isRestored) return;

    const path = pathname ?? '/';

    if (isLoggedIn && path === '/login') {
      router.replace('/');
    }
  }, [isLoggedIn, isRestored, pathname, router]);

  return null;
}
